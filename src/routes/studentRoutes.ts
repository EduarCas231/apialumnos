import { Router } from "express";
import { createStudentController } from "../controllers/studentController";
import { requireAuth } from "../middleware/auth";
import type { AuthService } from "../services/authService";
import type { StudentRepository } from "../repositories/studentRepository";


export function createStudentRouter(
  students: StudentRepository,
  authService: AuthService,
): Router {
  const router = Router();
  const controller = createStudentController(students);
  const auth = requireAuth(authService);


  router.post("/", controller.create);


  router.get("/", auth, controller.list);
  router.get("/me", auth, controller.getMe);
  router.get("/:id", auth, controller.getOne);
  router.put("/:id", auth, controller.update);
  router.delete("/:id", auth, controller.remove);

  return router;
}
