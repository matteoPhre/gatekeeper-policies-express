import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server.mjs";

describe("express playground api", () => {
  it("accepts a strong password", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/password/validate")
      .send({ password: "StrongGate#2026" });

    expect(response.status).toBe(200);
    expect(response.body.isValid).toBe(true);
  });

  it("rejects an invalid password", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/password/validate")
      .send({ password: "weak" });

    expect(response.status).toBe(400);
    expect(response.body.isValid).toBe(false);
  });

  it("blocks expired protected access", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/protected/profile")
      .set("x-user-id", "alice");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: "PASSWORD_EXPIRED" });
  });
});
