const express = require('express');
const mariadb = require('mariadb');

const app = express();
app.use(express.json());

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
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


/**
 * Liste aller Ausbilder ausgeben
 */
app.get("/ausbilder", async (request, response) => {
    let conn;
    let query;

    try {
        conn = await pool.getConnection();

        if (request.query.id) {
            query = `
                SELECT us.user_id, us.vorname, us.nachname, us.email, us.abteilung
                FROM an_user us
                JOIN ausbilder au
                    ON us.user_id = au.user_id
                WHERE au.ausbilder_id = ${request.query.id}
            `;
        } else {
            query = `
                SELECT us.email, au.ausbilder_id
                FROM an_user us
                JOIN ausbilder au
                    ON us.user_id = au.user_id
            `;
        }

        const results = await conn.query(query);

        response.send(results);

    } catch (error) {
        console.error("Query failed", error);

    } finally {
        if (conn) conn.end();
    }
});