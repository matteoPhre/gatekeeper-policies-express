import { IdentityPolicyEngine } from "@matteophre/gatekeeper-policies";

const input = process.env.INPUT_PASSWORD ?? "";

const engine = new IdentityPolicyEngine({
  minLength: 12,
  maxLength: 64,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  denyList: ["password", "qwerty", "admin"],
  persistence: {
    async getPasswordHistory() {
      return [];
    },
    async saveNewPassword() {
      return;
    },
  },
});

const result = engine.validateComplexity(input);
console.log(JSON.stringify(result, null, 2));

if (!result.isValid) {
  process.exit(1);
}
