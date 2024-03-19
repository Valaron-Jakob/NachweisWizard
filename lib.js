/**
 * Funktion zum Überprüfen, ob der Ausbilder existiert 
 */ 
async function existsAusbilder(conn, ausbilderId) {
    const results = await conn.query(
        "SELECT ausbilder_id FROM ausbilder WHERE ausbilder_id = ?",
        [ausbilderId]
    );
    return results.length > 0;
}

/** 
 * Funktion zum Überprüfen, ob ein Benutzer existiert (anhand einer gegebenen Mail)
 */
async function existsUserByMail(conn, email) {
    const results = await conn.query(
        "SELECT user_id FROM an_user WHERE email = ?",
        [email]
    );
    return results.length > 0;
}

/**
 * Funtion zum Zurückgeben aller Ausbilder
 */
async function getAllAusbilder(conn) {
    return await conn.query(`
        SELECT us.email, au.ausbilder_id
        FROM an_user us
        JOIN ausbilder au
            ON us.user_id = au.user_id
    `);
}

/**
 * Funktion zum Zurückgeben eines Ausbilders
 */
async function getAusbilder(conn, ausbilderId) {
    return await conn.query(`
        SELECT us.user_id, us.vorname, us.nachname, us.email, us.abteilung
        FROM an_user us
        JOIN ausbilder au
            ON us.user_id = au.user_id
        WHERE au.ausbilder_id = ?
    `, [ausbilderId]);
}

/**
 * Funktion zum Zurückgeben eines Ausbilders
 */
async function getUserByMail(conn, email) {
    return await conn.query(`
        SELECT user_id, vorname, nachname, email, abteilung
        FROM an_user
        WHERE email = ?
    `, [email]);
}

/**
 * Funktion zum Einfügen eines neuen Ausbilders und Benutzers
 */
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

/**
 * Funktion zum Bearbeiten eines bestehenden Ausbilders und Benutzers
 */
async function editAusbilder(conn, ausbilderId, data) {
    let queryString = [];
    let queryValues = [];

    for (const key in data) {
        queryString.push(key + " = ?");
        queryValues.push(data[key]);
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

/**
 * Funktion zum Löschen des Ausbilders
 */
async function deleteAusbilder(conn, ausbilderId) {
    const results = await conn.query(
        "SELECT user_id FROM ausbilder WHERE ausbilder_id = ?",
        [ausbilderId]
    );

    await conn.query("DELETE FROM ausbilder WHERE ausbilder_id = ?", [ausbilderId]);

    return results[0].user_id;
}

/**
 * Funktion zum Löschen des Users
 */
async function deleteUser(conn, userId) {
    await conn.query("DELETE FROM an_user WHERE user_id = ?", [userId]);
}


/**
 * Funktion zum Überprüfen, ob der Auszubildende existiert 
 */ 
async function existsAzubi(conn, azubiId) {
    const results = await conn.query(
        "SELECT azubi_id FROM auszubildender WHERE azubi_id = ?",
        [azubiId]
    );
    return results.length > 0;
}

/**
 * Funtion zum Zurückgeben aller Auszubildenden
 */
async function getAllAzubi(conn) {
    return await conn.query(`
        SELECT us.email, au.azubi_id
        FROM an_user us
        JOIN auszubildender au
            ON us.user_id = au.user_id
    `);
}

/**
 * Funktion zum Zurückgeben eines Auszubildenden
 */
async function getAzubi(conn, azubiId) {
    return await conn.query(`
        SELECT us.user_id, us.vorname, us.nachname, us.email, us.abteilung, au.azubi_id, au.ausbilder_id, au.ausbildungsbeginn, au.ausbildungsberuf
        FROM an_user us
        JOIN auszubildender au
            ON us.user_id = au.user_id
        WHERE au.azubi_id = ?
    `, [azubiId]);
}

/**
 * Funktion zum Einfügen eines neuen Auszubildenden und Benutzers
 */
async function createAzubi(conn, data) {
    const insertResults = await conn.query(`
        INSERT INTO an_user (pw_hash, vorname, nachname, email, abteilung) VALUES (?, ?, ?, ?, ?);
        SET @tmp_user_id = LAST_INSERT_ID();
        
        INSERT INTO auszubildender (user_id, ausbilder_id, ausbildungsbeginn, ausbildungsberuf) VALUES (@tmp_user_id, ?, ?, ?);
        SET @tmp_azubi_id = LAST_INSERT_ID();
        
        SELECT @tmp_azubi_id AS azubi_id;
    `, [
        data.pw_hash.toString(),
        data.vorname.toString(),
        data.nachname.toString(),
        data.email.toString(),
        data.abteilung.toString(),
        data.ausbilder_id.toString(),
        data.ausbildungsbeginn.toString(),
        data.ausbildungsberuf.toString()
    ]);
    console.log(insertResults)
    return insertResults[4];
}

/**
 * Funktion zum Bearbeiten eines bestehenden Ausbilders und Benutzers
 */
async function editAzubi(conn, azubiId, data) {
    let queryString = [];
    let queryValues = [];

    for (const key in data) {
        queryString.push(key + " = ?");
        queryValues.push(data[key]);
    }

    queryValues.push(azubiId);

    const results = await conn.query(`
        UPDATE an_user us
        JOIN auszubildender au
            ON us.user_id = au.user_id
        SET 
            ${queryString.join(", ")}
        WHERE au.azubi_id = ?;
    `, queryValues);
}

/**
 * Funktion zum Löschen des Auszubildenden
 */
async function deleteAzubi(conn, azubiId) {
    const results = await conn.query(
        "SELECT user_id FROM auszubildender WHERE azubi_id = ?",
        [azubiId]
    );

    await conn.query("DELETE FROM auszubildender WHERE azubi_id = ?", [azubiId]);

    return results[0].user_id;
}

export default {
    existsAusbilder,
    existsUserByMail,
    getAllAusbilder,
    getAusbilder,
    getUserByMail,
    createAusbilder,
    editAusbilder,
    deleteAusbilder,
    deleteUser,
    existsAzubi,
    getAllAzubi,
    getAzubi,
    createAzubi,
    editAzubi,
    deleteAzubi
};