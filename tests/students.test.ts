import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildTestApp, authenticate } from "./helpers";

const sample = {
  nombre: "Juan",
  apellido: "Pérez",
  matricula: "A001",
  email: "juan@alumnos.test",
  password: "secret123",
};

describe("CRUD de estudiantes (protegido)", () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = buildTestApp();
    token = await authenticate(app);
  });

  const auth = (req: request.Test) =>
    req.set("Authorization", `Bearer ${token}`);

  it("rechaza el acceso sin token (401)", async () => {
    const res = await request(app).get("/api/students");
    expect(res.status).toBe(401);
  });

  it("crea un estudiante (201)", async () => {
    const res = await auth(request(app).post("/api/students")).send(sample);
    expect(res.status).toBe(201);
    const { password: _pw, ...publicFields } = sample;
    expect(res.body.data).toMatchObject(publicFields);
    expect(res.body.data.id).toBeTypeOf("number");
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it("valida los campos obligatorios (400)", async () => {
    const res = await auth(request(app).post("/api/students")).send({
      nombre: "",
      apellido: "X",
      matricula: "A9",
      email: "no-valido",
    });
    expect(res.status).toBe(400);
  });

  it("lista los estudiantes creados", async () => {
    await auth(request(app).post("/api/students")).send(sample);
    const res = await auth(request(app).get("/api/students"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("obtiene un estudiante por id y responde 404 si no existe", async () => {
    const created = await auth(request(app).post("/api/students")).send(sample);
    const id = created.body.data.id as number;

    const ok = await auth(request(app).get(`/api/students/${id}`));
    expect(ok.status).toBe(200);

    const missing = await auth(request(app).get("/api/students/9999"));
    expect(missing.status).toBe(404);
  });

  it("obtiene el perfil desde los claims sin enviar un id", async () => {
    const created = await auth(request(app).post("/api/students")).send(sample);
    const id = created.body.data.id as number;
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: sample.email, password: sample.password });
    const studentToken = login.body.token as string;

    const me = await request(app)
      .get("/api/students/me")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({
      id,
      nombre: sample.nombre,
      apellido: sample.apellido,
      matricula: sample.matricula,
      email: sample.email,
    });
    expect(me.body.data.password_hash).toBeUndefined();
  });

  it("permite que el token de usuario encuentre al estudiante por correo", async () => {
    const created = await auth(request(app).post("/api/students")).send(sample);
    const id = created.body.data.id as number;
    const userToken = await authenticate(app, sample.email, "accountpass123");

    const response = await request(app)
      .get("/api/students/me")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id,
      nombre: sample.nombre,
      apellido: sample.apellido,
      matricula: sample.matricula,
      email: sample.email,
    });
    expect(response.body.data.password_hash).toBeUndefined();
  });

  it("actualiza un estudiante (200)", async () => {
    const created = await auth(request(app).post("/api/students")).send(sample);
    const id = created.body.data.id as number;

    const res = await auth(request(app).put(`/api/students/${id}`)).send({
      ...sample,
      apellido: "García",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.apellido).toBe("García");
  });

  it("elimina un estudiante (204) y luego 404", async () => {
    const created = await auth(request(app).post("/api/students")).send(sample);
    const id = created.body.data.id as number;

    const del = await auth(request(app).delete(`/api/students/${id}`));
    expect(del.status).toBe(204);

    const after = await auth(request(app).get(`/api/students/${id}`));
    expect(after.status).toBe(404);
  });

  it("rechaza matrícula o correo duplicados (409)", async () => {
    await auth(request(app).post("/api/students")).send(sample);
    const res = await auth(request(app).post("/api/students")).send(sample);
    expect(res.status).toBe(409);
  });
});
