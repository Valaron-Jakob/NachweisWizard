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


/**
 * Gibt alle Ausbilder zurück wenn als Filter keine ID mitgegeben wurde
 */
app.get("/ausbilder", async (request, response) => {
    let conn;

    try {
        conn = await pool.getConnection();

        // Gibt einen Ausbilder zurück wenn eine ID angegeben wurde
        if (request.query.id) {
            const ausbilderId = request.query.id;
            const results = await getAusbilder(conn, ausbilderId);

            if (results.length === 0) {
                return response.status(404).send({
                    errors: ["There is no Ausbilder with this id"]
                });
            }
            return response.send(results);

        // Gibt alle Ausbilder zurück
        } else {
            const results = await getAllAusbilder(conn);
            return response.send(results);
        }

    } catch (error) {
        console.log(error);
        response.status(500).send(error);

    } finally {
        if (conn) conn.end();
    }
});


/**
 * Legt einen neuen Ausbilder an, wenn dieser noch nicht existiert
 */
app.post("/ausbilder", async (request, response) => {
    let conn;

    const data = request.body;

    try {
        conn = await pool.getConnection();

        if (request.query.id) {
            const ausbilderId = request.query.id;
            const results = await editAusbilder(conn, ausbilderId, data);

            return response.send({
                message: ["Edited ausbilder fields"],
                ausbilder_id: ausbilderId,
                data: data
            });
        }

        // Überprüfen, ob ein Benutzer mit derselben E-Mail-Adresse bereits existiert
        const userExists = await existsUserByMail(conn, data.email);

        if (userExists) {
            const user = await getUserByMail(conn, data.email);

            return response.status(409).send({
                errors: ["A user with this email already exists"],
                user_id: user[0].user_id
            });
        }

        conn.beginTransaction();
        results = await createAusbilder(conn, data); 
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


/**
 * Löscht einen Ausbilder, wenn dieser existiert
 */
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

        const ausbilderExists = await existsAusbilder(conn, ausbilderId);
        if (!ausbilderExists) {
            return response.status(404).send();
        }

        await conn.beginTransaction();

        const userId = await deleteAusbilder(conn, ausbilderId);
        await deleteUser(conn, userId);

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


// Funktion zum Überprüfen, ob der Ausbilder existiert
async function existsAusbilder(conn, ausbilderId) {
    const results = await conn.query(
        "SELECT ausbilder_id FROM ausbilder WHERE ausbilder_id = ?",
        [ausbilderId]
    );
    return results.length > 0;
}

// Funktion zum Überprüfen, ob ein Benutzer existiert (anhand einer gegebenen Mail)
async function existsUserByMail(conn, email) {
    const results = await conn.query(
        "SELECT user_id FROM an_user WHERE email = ?",
        [email]
    );
    return results.length > 0;
}

// Funtion zum Zurückgeben aller Ausbilder
async function getAllAusbilder(conn) {
    return await conn.query(`
        SELECT us.email, au.ausbilder_id
        FROM an_user us
        JOIN ausbilder au
            ON us.user_id = au.user_id
    `);
}

// Funktion zum Zurückgeben eines Ausbilders
async function getAusbilder(conn, ausbilderId) {
    return await conn.query(`
        SELECT us.user_id, us.vorname, us.nachname, us.email, us.abteilung
        FROM an_user us
        JOIN ausbilder au
            ON us.user_id = au.user_id
        WHERE au.ausbilder_id = ?
    `, [ausbilderId]);
}

// Funktion zum Zurückgeben eines Ausbilders
async function getUserByMail(conn, email) {
    return await conn.query(`
        SELECT user_id, vorname, nachname, email, abteilung
        FROM an_user
        WHERE email = ?
    `, [email]);
}

// Funktion zum Einfügen eines neuen Ausbilders und Benutzers
async function createAusbilder(conn, data) {
    const insertResults = await conn.query(`
        INSERT INTO an_user (pw_hash, vorname, nachname, email, abteilung) VALUES (?, ?, ?, ?, ?);
        SET @tmp_user_id = LAST_INSERT_ID();
        
        INSERT INTO ausbilder (user_id) VALUES (@tmp_user_id);
        SET @tmp_ausbilder_id = LAST_INSERT_ID();
        
        SELECT @tmp_ausbilder_id AS ausbilder_id;
    `, [
        data.pw_hash.toString(),
        data.vorname.toString(),
        data.nachname.toString(),
        data.email.toString(),
        data.abteilung.toString()
    ]);
    console.log(insertResults)
    return insertResults[4];
}

// Funktion zum Bearbeiten eines bestehenden Ausbilders und Benutzers
async function editAusbilder(conn, ausbilderId, data) {
    let queryString = [];
    let queryValues = [];

    for (key in data) {
        queryValues.push(data[key]);
        queryString.push(key + " = ?");
    }

    queryValues.push(ausbilderId);

    const results = await conn.query(`
        UPDATE an_user us
        JOIN ausbilder au
            ON us.user_id = au.user_id
        SET 
            ${queryString.join(", ")}
        WHERE au.ausbilder_id = ?;
    `, queryValues);

    console.log(results);
}

// Funktion zum Löschen des Ausbilders
async function deleteAusbilder(conn, ausbilderId) {
    const results = await conn.query(
        "SELECT user_id FROM ausbilder WHERE ausbilder_id = ?",
        [ausbilderId]
    );

    await conn.query("DELETE FROM ausbilder WHERE ausbilder_id = ?", [ausbilderId]);

    return results[0].user_id;
}

// Funktion zum Löschen des Users
async function deleteUser(conn, userId) {
    await conn.query("DELETE FROM an_user WHERE user_id = ?", [userId]);
}