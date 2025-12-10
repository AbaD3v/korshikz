import { Router } from "express";
import usersRouter from "./users.js";
import listingsRouter from "./listings.js";
import chatsRouter from "./chats.js";

const router = Router();
router.use("/users", usersRouter);
router.use("/listings", listingsRouter);
router.use("/chats", chatsRouter);

export default router;
