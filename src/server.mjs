import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import express from "express";
import {
  IdentityPolicyEngine,
  createStatusJsonExpiryMiddleware,
} from "@matteophre/gatekeeper-policies";

const PORT = Number(process.env.PORT ?? 3001);

function sha256(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function toUtf8String(value) {
  if (typeof value === "string") {
    return value;
  }

  return Buffer.from(value).toString("utf8");
}

const users = new Map([
  [
    "alice",
    {
      passwordCreatedAt: new Date("2024-01-01T00:00:00.000Z"),
      passwordHistory: [sha256("OldPassword#2024"), sha256("OlderPassword#2023")],
    },
  ],
  [
    "bob",
    {
      passwordCreatedAt: new Date(),
      passwordHistory: [sha256("BobPassword#2026")],
    },
  ],
]);

const engine = new IdentityPolicyEngine({
  minLength: 12,
  maxLength: 64,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  expiryDays: 30,
  historyLimit: 5,
  denyList: ["password", "qwerty", "admin"],
  preventRepeatedChars: true,
  maxRepeatedChars: 2,
  preventSequentialChars: true,
  maxSequentialChars: 4,
  normalizeTrim: true,
  normalizeUnicode: true,
  unicodeNormalizationForm: "NFKC",
  persistence: {
    async getPasswordHistory(userId) {
      return users.get(userId)?.passwordHistory ?? [];
    },
    async saveNewPassword(userId, newHash) {
      const existing = users.get(userId) ?? {
        passwordCreatedAt: new Date(),
        passwordHistory: [],
      };

      const updatedHistory = [newHash, ...existing.passwordHistory].slice(0, 5);
      users.set(userId, {
        passwordCreatedAt: new Date(),
        passwordHistory: updatedHistory,
      });
    },
  },
});

export function createApp() {
  const app = express();
  app.use(express.json());

  const expiryMiddleware = createStatusJsonExpiryMiddleware({
    getUserIdAndDateFn: async (req) => {
      const userId = String(req.header("x-user-id") ?? "").trim();
      if (!userId) {
        throw new Error("Missing x-user-id header.");
      }

      const user = users.get(userId);
      const headerDate = req.header("x-password-created-at");
      const passwordCreatedAt = headerDate
        ? new Date(headerDate)
        : user?.passwordCreatedAt ?? new Date(0);

      return { userId, passwordCreatedAt };
    },
    evaluatePasswordExpiryDecision: (passwordCreatedAt) =>
      engine.evaluatePasswordExpiryDecision(passwordCreatedAt),
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "gatekeeper-policies-express",
      message: "Use /password/validate, /password/change and /protected/profile",
      users: ["alice", "bob"],
    });
  });

  app.get("/demo/users", (_req, res) => {
    const payload = Array.from(users.entries()).map(([userId, data]) => ({
      userId,
      passwordCreatedAt: data.passwordCreatedAt.toISOString(),
      historyCount: data.passwordHistory.length,
    }));

    res.json(payload);
  });

  app.post("/password/validate", (req, res) => {
    const password = String(req.body?.password ?? "");
    const complexity = engine.validateComplexity(password);
    res.status(complexity.isValid ? 200 : 400).json(complexity);
  });

  app.post("/password/change", async (req, res) => {
    const userId = String(req.body?.userId ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");

    if (!userId || !newPassword) {
      res.status(400).json({
        code: "BAD_REQUEST",
        message: "userId and newPassword are required.",
      });
      return;
    }

    const complexity = engine.validateComplexity(newPassword);
    if (!complexity.isValid) {
      res.status(400).json({
        code: "WEAK_PASSWORD",
        details: complexity.errors,
      });
      return;
    }

    const canRotate = await engine.validateRotation(
      newPassword,
      userId,
      async (candidate, encrypted) => sha256(toUtf8String(candidate)) === encrypted,
    );

    if (!canRotate) {
      res.status(409).json({
        code: "PASSWORD_REUSED",
        message: "Password was already used recently.",
      });
      return;
    }

    await engine.getConfig().persistence.saveNewPassword(userId, sha256(newPassword));

    res.status(200).json({
      code: "PASSWORD_UPDATED",
      userId,
    });
  });

  app.get("/protected/profile", expiryMiddleware, (req, res) => {
    const userId = String(req.header("x-user-id") ?? "unknown");
    res.json({
      userId,
      profile: {
        role: "demo-user",
        data: "Access granted: password policy check passed.",
      },
    });
  });

  app.use((error, _req, res, _next) => {
    res.status(400).json({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Unexpected error.",
    });
  });

  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => {
    console.log(`Express playground running on http://localhost:${PORT}`);
  });
}
