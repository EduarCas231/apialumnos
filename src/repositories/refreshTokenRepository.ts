import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface RefreshTokenRecord {
    id: number;
    user_id: number;
    user_kind: "user" |  "student";
    token: string;
    expires_at: number;
    created_at: number;
}

export class RefreshTokenRepository {
    constructor(private readonly db: DatabaseSync) {
    }

    delete(token: string): boolean {
        const stmt = this.db.prepare("DELETE FROM refresh_tokens WHERE token = ?");
        const result = stmt.run(token);
        return result.changes > 0;
    }

    deleteByUser(userId: number, userKind: "user" | "student"): number {
        const stmt = this.db.prepare("DELETE FROM refresh_tokens WHERE user_id = ? AND user_kind = ?");
        const result = stmt.run(userId, userKind);
        return result.changes > 0;
    }

} 