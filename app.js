const express = require('express');
const mariadb = require('mariadb');

require('dotenv').config();

const app = express();
app.use(express.json());

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
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
 * Gibt alle Ausbilder zurück wenn als Filter keine ID mitgegeben wurde
 */
app.get("/ausbilder", async (request, response) => {
    let conn;
    let errors = [];
    let results;

    try {
        conn = await pool.getConnection();

        // Gibt einen Ausbilder zurück wenn eine ID angegeben wurde
        if (request.query.id) {
            const query = request.query.id.toString();

            results = await conn.query(`
                SELECT us.user_id, us.vorname, us.nachname, us.email, us.abteilung
                FROM an_user us
                JOIN ausbilder au
                    ON us.user_id = au.user_id
                WHERE au.ausbilder_id = ?
            `, query);

            if (query.match(/[0-9]*/)) {
                errors.push("The given id is not numeric");
            }

            if (results.length == 0) {
                errors.push("There is no ausbilder with this id");
            }

        // Gibt alle Ausbilder zurück
        } else {
            results = await conn.query(`
                SELECT us.email, au.ausbilder_id
                FROM an_user us
                JOIN ausbilder au
                    ON us.user_id = au.user_id
            `);
        }

        if (errors) {
            response.status(404).send({ "errors": errors });

        } else {
            response.send(results);
        }

    } catch (error) {
        console.error("Query failed", error);

    } finally {
        if (conn) conn.end();
    }
});