import express from 'express';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
import db from './lib';


dotenv.config();

const app = express();
app.use(express.json());

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    connectionLimit: 5,
    multipleStatements: true
});

// Nutzt einen Port aus den Umgebungsvariablen oder 3300 als Fallback
const PORT = process.env.PORT || 3300;

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

// Ermöglicht eine Statusabfrage über /status
app.get("/status", (request, response) => {
    const status = {
        "Status": "Running"
    };

    response.send(status);
});

// Gibt alle Ausbilder zurück wenn als Filter keine ID mitgegeben wurde
app.get("/ausbilder", async (request, response) => {
    let conn;

    try {
        conn = await pool.getConnection();

        // Gibt einen Ausbilder zurück wenn eine ID angegeben wurde
        if (request.query.id) {
            const ausbilderId = request.query.id;
            const results = await db.getAusbilder(conn, ausbilderId);

            if (results.length === 0) {
                return response.status(404).send({
                    errors: ["There is no Ausbilder with this id"]
                });
            }
            return response.send(results);

        // Gibt alle Ausbilder zurück
        } else {
            const results = await db.getAllAusbilder(conn);
            return response.send(results);
        }

    } catch (error) {
        console.log(error);
        response.status(500).send(error);

    } finally {
        if (conn) conn.end();
    }
});

// Legt einen neuen Ausbilder an, wenn dieser noch nicht existiert
app.post("/ausbilder", async (request, response) => {
    let conn;

    const data = request.body;

    try {
        conn = await pool.getConnection();

        if (request.query.id) {
            const ausbilderId = request.query.id;
            const results = await db.editAusbilder(conn, ausbilderId, data);

            return response.send({
                message: ["Edited ausbilder fields"],
                ausbilder_id: ausbilderId,
                data: data
            });
        }

        // Überprüfen, ob ein Benutzer mit derselben E-Mail-Adresse bereits existiert
        const userExists = await db.existsUserByMail(conn, data.email);

        if (userExists) {
            const user = await db.getUserByMail(conn, data.email);

            return response.status(409).send({
                errors: ["A user with this email already exists"],
                user_id: user[0].user_id
            });
        }

        conn.beginTransaction();
        results = await db.createAusbilder(conn, data); 
        conn.commit(); 

        return response.send({
            "ausbilder_id": Number(results[0].ausbilder_id)
        });

    } catch (error) {
        console.log(error);

        if (conn) await conn.rollback();
        response.status(500).send(error);

    } finally {
        if (conn) conn.end();
    }
});

// Löscht einen Ausbilder, wenn dieser existiert
app.delete("/ausbilder", async (request, response) => {
    let conn;

    try {
        conn = await pool.getConnection();

        const ausbilderId = request.query.id;
        if (!ausbilderId) {
            return response.status(400).send({
                errors: ["An id parameter must be given"]
            });
        }

        const ausbilderExists = await db.existsAusbilder(conn, ausbilderId);
        if (!ausbilderExists) {
            return response.status(404).send();
        }

        await conn.beginTransaction();

        const userId = await db.deleteAusbilder(conn, ausbilderId);
        await db.deleteUser(conn, userId);

        await conn.commit();

        response.send({
            "ausbilder_id": ausbilderId,
            "user_id": userId
        });

    } catch (error) {
        console.error(error);

        if (conn) await conn.rollback();
        response.status(500).send(error);

    } finally {
        if (conn) conn.end();
    }
});
