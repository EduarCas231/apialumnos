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

    create(
        userId:number,
        userKind: "user" | "student",
        expiresInSeconds: number
    ): { token: string; expiresAt: number } {
        const token = randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + expiresInSeconds;
        
        const stmt = this.db.prepare(
            "INSERT INTO refresh_tokens (user_id, user_kind, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
        );
        stmt.run(userId, userKind, token, expiresAt, now);

        return { token, expiresAt };
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

    deleteExpired(): number {
        const now = Math.floor(Date.now() / 1000);
        const stmt = this.db.prepare("DELETE FROM refresh_tokens WHERE expires_at < ?");
        const result = stmt.run(now);
        return result.changes;
    }

} 