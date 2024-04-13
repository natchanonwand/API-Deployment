const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const corsOptions = {
    origin: ['http://localhost:3001', 'https://react-deployment-fawn.vercel.app'], 
    optionsSuccessStatus: 200 
  };
  
app.use(cors(corsOptions));

// Secret key for JWT
const secret = 'Fullstack-login-project';

app.use(cors());
app.use(express.json());

// Database configuration
const connection = mysql.createConnection(process.env.DATABASE_URL);

// Utility function for connecting to MySQL database
function connectToDatabase() {
    return new Promise((resolve, reject) => {
        connection.connect(err => {
            if (err) reject(err);
            resolve();
        });
    });
}

// login path

// Registration endpoint
app.post('/register', async (req, res) => {
    const { email, password, fname, lname } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user data with hashed password into the database
        const insertQuery = 'INSERT INTO users (email, password, fname, lname) VALUES (?, ?, ?, ?)';
        await connection.promise().query(insertQuery, [email, hashedPassword, fname, lname]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// GET endpoint to fetch all users
app.get('/register', async (req, res) => {
    try {
        // Directly using the existing connection for the query
        const [rows] = await connection.promise().query('SELECT * FROM users');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query the database to find the user with the provided email
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);

        // If no user found with the provided email, return an error
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0]; // Assuming the user exists

        // Compare the provided password with the hashed password from the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If passwords match, generate a JWT token and send it in the response
        if (passwordMatch) {
            const token = jwt.sign({ email: user.email }, secret, { expiresIn: '1h' });
            return res.json({ status: 'ok', message: 'login success', token });
        } else {
            return res.status(401).json({ status: 'error', message: 'login failed' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Error logging in' });
    }
});

// Authentication endpoint
app.post('/authen', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        var decoded = jwt.verify(token, secret);
        res.json({ status: 'ok', decoded });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});





// Production line database

app.get('/api/business', async (req, res) => {
    try {
        await connectToDatabase();
        connection.query('SELECT * FROM business', (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/business', async (req, res) => {
    const { Business_name } = req.body;

    if (!Business_name) {
        return res.status(400).send('Business name is required');
    }

    try {
        await connectToDatabase();

        // Find the maximum Business_id and add 1 to it for the new ID
        const [maxIdResult] = await connection.promise().query('SELECT MAX(Business_id) as maxId FROM business');
        const maxId = maxIdResult[0].maxId || 0; // Default to 0 if there are no rows
        const newBusinessId = maxId + 1;

        const query = `INSERT INTO business (Business_id, Business_name) VALUES (?, ?)`;
        const [result] = await connection.promise().query(query, [newBusinessId, Business_name]);

        const insertedBusiness = { Business_id: newBusinessId, Business_name };
        res.status(201).json(insertedBusiness);
    } catch (error) {
        console.error('Error adding business:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.put('/api/business/:id', async (req, res) => {
    try {
        const { id } = req.params; // Business_id from the URL
        const { Business_name } = req.body; // New Business_name from the request body

        // Simple validation
        if (!Business_name) {
            return res.status(400).send('Business name is required');
        }

        await connectToDatabase();

        // Use parameterized query to prevent SQL injection
        const query = 'UPDATE business SET Business_name = ? WHERE Business_id = ?';

        connection.query(query, [Business_name, id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (results.affectedRows === 0) {
                return res.status(404).send('Business not found');
            }
            res.status(200).send('Business updated successfully');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/business/:id', async (req, res) => {
    try {
        const { id } = req.params; // Business_id from the URL

        await connectToDatabase();

        // Use parameterized query to prevent SQL injection
        const query = 'DELETE FROM business WHERE Business_id = ?';

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (results.affectedRows === 0) {
                return res.status(404).send('Business not found');
            }
            res.status(200).send('Business deleted successfully');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/station', async (req, res) => {
    try {
        await connectToDatabase();

        const { business_id } = req.query;

        // If business_id is provided in the query parameters, filter stations by it
        let query = 'SELECT * FROM station';
        if (business_id) {
            query += ` WHERE Business_id = ${business_id}`;
        }

        connection.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.put('/api/station/:id', async (req, res) => {
    try {
        const { id } = req.params; // Machine_ID from the URL
        const { Machine_name} = req.body; // New values from the request body

        // Basic validation
        if (!Machine_name) {
            return res.status(400).send('Machine name is required');
        }

        await connectToDatabase();

        const query = 'UPDATE station SET Machine_name = ? WHERE Machine_ID = ?';

        connection.query(query, [Machine_name, id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (results.affectedRows === 0) {
                // No station was updated, likely because the Machine_ID doesn't exist
                return res.status(404).send('Station not found');
            }
            res.status(200).send('Station updated successfully');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/station/:id', async (req, res) => {
    try {
        const { id } = req.params; // Machine_ID from the URL

        await connectToDatabase();

        const query = 'DELETE FROM station WHERE Machine_ID = ?';

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (results.affectedRows === 0) {
                // No station was deleted, likely because the Machine_ID doesn't exist
                return res.status(404).send('Station not found');
            }
            res.status(200).send('Station deleted successfully');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/station', async (req, res) => {
    const { Machine_name, Business_id } = req.body;

    // Basic validation
    if (!Machine_name || !Business_id) {
        return res.status(400).send('Both Machine name and Business ID are required');
    }

    try {
        await connectToDatabase();

        // Start a transaction
        await connection.promise().beginTransaction();

        // Validate the Business_id exists in the business table
        const validationQuery = 'SELECT 1 FROM business WHERE Business_id = ?';
        const [validationResults] = await connection.promise().query(validationQuery, [Business_id]);
        if (validationResults.length === 0) {
            // No matching business found for the provided Business_id
            await connection.promise().rollback(); // Rollback transaction
            return res.status(400).send('Invalid Business ID');
        }

        // Get the maximum Machine_ID from the station table and increment it by 1
        const maxIdQuery = 'SELECT MAX(Machine_ID) as maxId FROM station';
        const [maxIdResult] = await connection.promise().query(maxIdQuery);
        const maxId = maxIdResult[0].maxId || 0; // Default to 0 if no machines exist
        const newMachineId = maxId + 1;

        // Business_id is valid, and new Machine_ID is determined, proceed to insert into station table
        const insertQuery = 'INSERT INTO station (Machine_ID, Machine_name, Business_id) VALUES (?, ?, ?)';
        const [insertResults] = await connection.promise().query(insertQuery, [newMachineId, Machine_name, Business_id]);

        // Commit the transaction
        await connection.promise().commit();

        // Send back the ID of the new station
        res.status(201).send({ Machine_ID: newMachineId });
    } catch (error) {
        await connection.promise().rollback(); // Rollback transaction on error
        console.error('Failed to add station:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/api/countrecords_counttray', async (req, res) => {
    try {
        await connectToDatabase();
        const sql = `
            SELECT cr.*, st.Machine_name 
            FROM countrecords_counttray cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
        `;
        connection.query(sql, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/business/countrecords_counttray/:Business_id', async (req, res) => {
    const { Business_id } = req.params;
    try {
        const sql = "SELECT * FROM countrecords_counttray WHERE Business_id = ?";
        const [results] = await connection.promise().query(sql, [Business_id]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching count records:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords', async (req, res) => {
    try {
        const sql = "SELECT * FROM countrecords";
        const [results] = await connection.promise().query(sql);
        res.json(results);
    } catch (error) {
        console.error('Error fetching count records:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name 
            FROM countrecords_counttray cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching records by Lot_id:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name
            FROM countrecords cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/api/countrecords_counttray/latest/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name
            FROM countrecords_counttray cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?  -- Bind the Lot_id value here
            AND cr.Machine_ID = (
                SELECT MAX(Machine_ID) 
                FROM countrecords_counttray 
                WHERE Lot_id = cr.Lot_id
                -- Optionally filter by Direction here if necessary
            )
            ORDER BY 
                CASE WHEN cr.Direction = 'out' THEN 1 ELSE 2 END
            LIMIT 1;
        
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results.length > 0 ? results[0] : {});
    } catch (error) {
        console.error('Error fetching the latest record by Lot_id:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/api/countrecords/latest/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name
            FROM countrecords cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?  -- Bind the Lot_id value here
            AND cr.Machine_ID = (
                SELECT MAX(Machine_ID) 
                FROM countrecords 
                WHERE Lot_id = cr.Lot_id
                -- Optionally filter by Direction here if necessary
            )
            ORDER BY 
                CASE WHEN cr.Direction = 'out' THEN 1 ELSE 2 END
            LIMIT 1;
        
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results.length > 0 ? results[0] : {});
    } catch (error) {
        console.error('Error fetching the latest record:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/CorrectLatest/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name
            FROM countrecords_counttray cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?  -- Bind the Lot_id value here
            AND cr.Judgement = 'Correct'
            AND cr.Machine_ID = (
                SELECT MAX(crt.Machine_ID)
                FROM countrecords_counttray crt
                WHERE crt.Lot_id = cr.Lot_id
                AND crt.Judgement = 'Correct'
                -- You can also apply additional filters here if needed, e.g., by Direction
            )
            ORDER BY 
                CASE WHEN cr.Direction = 'out' THEN 1 ELSE 2 END
            LIMIT 1;
        
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results.length > 0 ? results[0] : {});
    } catch (error) {
        console.error('Error fetching the latest record by Lot_id:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/api/countrecords/CorrectLatest/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = `
            SELECT cr.*, st.Machine_name
            FROM countrecords cr
            LEFT JOIN station st ON cr.Machine_ID = st.Machine_ID
            WHERE cr.Lot_id = ?  -- Bind the Lot_id value here
            AND cr.Judgement = 'Correct'
            AND cr.Machine_ID = (
                SELECT MAX(crt.Machine_ID)
                FROM countrecords crt
                WHERE crt.Lot_id = cr.Lot_id
                AND crt.Judgement = 'Correct'
                -- You can also apply additional filters here if needed, e.g., by Direction
            )
            ORDER BY 
                CASE WHEN cr.Direction = 'out' THEN 1 ELSE 2 END
            LIMIT 1;
        
        `;
        const [results] = await connection.promise().query(sql, [Lot_id]);
        res.json(results.length > 0 ? results[0] : {});
    } catch (error) {
        console.error('Error fetching the latest record:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/countrecords_counttray', async (req, res) => {
    const data = req.body; 

    try {
        data.forEach(async (item) => {
            const sql = `
                INSERT INTO countrecords_counttray (Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good, Business_id, Judgement)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.promise().query(sql, [item.Lot_id, item.Direction, item.Timestamp, item.Machine_ID, item.Substrate, item.TTL, item.badmark, item.ASSY_input, item.NG, item.Good, item.Business_id, item.Judgement]);
        });

        res.json({ message: "Data inserted successfully" });
    } catch (error) {
        console.error('Error inserting records:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/countrecords', async (req, res) => {
    const data = req.body; 

    try {
        data.forEach(async (item) => {
            const sql = `
                INSERT INTO countrecords (Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.promise().query(sql, [item.Lot_id, item.Direction, item.Timestamp, item.Machine_ID, item.Substrate, item.TTL, item.badmark, item.ASSY_input, item.NG, item.Good]);
        });

        res.json({ message: "Data inserted successfully" });
    } catch (error) {
        console.error('Error inserting records:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/countrecords_counttray/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = "DELETE FROM countrecords_counttray WHERE Lot_id = ?";
        const [result] = await connection.promise().query(sql, [Lot_id]);
        res.json({ rowcount: result.affectedRows });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/countrecords/:Lot_id', async (req, res) => {
    const { Lot_id } = req.params;
    try {
        const sql = "DELETE FROM countrecords WHERE Lot_id = ?";
        const [result] = await connection.promise().query(sql, [Lot_id]);
        res.json({ rowcount: result.affectedRows });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/Position/:Machine_ID/:Direction/:Lot_id?', async (req, res) => {
    const { Machine_ID, Direction, Lot_id } = req.params;

    try {
        let sql;
        let params;

        // Include Lot_id in the query if provided
        if (Lot_id) {
            sql = `
                SELECT Lot_id, Timestamp, Direction, Machine_ID, Substrate, TTL
                FROM countrecords_counttray 
                WHERE Machine_ID = ? AND Direction = ? AND Lot_id = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction, Lot_id];
        } else {
            sql = `
                SELECT Lot_id, Timestamp, Direction, Machine_ID, Substrate, TTL
                FROM countrecords_counttray 
                WHERE Machine_ID = ? AND Direction = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction];
        }

        const [results] = await connection.promise().query(sql, params);

        // If no data found, send a 404 response
        if (results.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching the newest data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/PositionCBM/:Machine_ID/:Direction/:Lot_id?', async (req, res) => {
    const { Machine_ID, Direction, Lot_id } = req.params;

    try {
        let sql;
        let params;

        if (Lot_id) {
            // Query when Lot_id is provided
            sql = `
                SELECT Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good 
                FROM countrecords_counttray 
                WHERE Machine_ID = ? AND Direction = ? AND Lot_id = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction, Lot_id];
        } else {
            // Query when Lot_id is not provided
            sql = `
                SELECT Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good 
                FROM countrecords_counttray 
                WHERE Machine_ID = ? AND Direction = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction];
        }

        const [results] = await connection.promise().query(sql, params);

        // If no data found, send a 404 response
        if (results.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching the newest data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords/Position/:Machine_ID/:Direction/:Lot_id?', async (req, res) => {
    const { Machine_ID, Direction, Lot_id } = req.params;

    try {
        let sql;
        let params;

        // Include Lot_id in the query if provided
        if (Lot_id) {
            sql = `
                SELECT Lot_id, Timestamp, Direction, Machine_ID, Substrate, TTL
                FROM countrecords
                WHERE Machine_ID = ? AND Direction = ? AND Lot_id = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction, Lot_id];
        } else {
            sql = `
                SELECT Lot_id, Timestamp, Direction, Machine_ID, Substrate, TTL
                FROM countrecords
                WHERE Machine_ID = ? AND Direction = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction];
        }

        const [results] = await connection.promise().query(sql, params);

        // If no data found, send a 404 response
        if (results.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching the newest data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords/PositionCBM/:Machine_ID/:Direction/:Lot_id?', async (req, res) => {
    const { Machine_ID, Direction, Lot_id } = req.params;

    try {
        let sql;
        let params;

        if (Lot_id) {
            // Query when Lot_id is provided
            sql = `
                SELECT Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good 
                FROM countrecords
                WHERE Machine_ID = ? AND Direction = ? AND Lot_id = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction, Lot_id];
        } else {
            // Query when Lot_id is not provided
            sql = `
                SELECT Lot_id, Direction, Timestamp, Machine_ID, Substrate, TTL, badmark, ASSY_input, NG, Good 
                FROM countrecords
                WHERE Machine_ID = ? AND Direction = ? 
                ORDER BY Timestamp DESC 
                LIMIT 1
            `;
            params = [Machine_ID, Direction];
        }

        const [results] = await connection.promise().query(sql, params);

        // If no data found, send a 404 response
        if (results.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching the newest data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/Lot_id/', async (req, res) => {
    try {
        const sql = "SELECT DISTINCT Lot_id FROM countrecords_counttray";
        const [results] = await connection.promise().query(sql);
        res.json(results);
    } catch (error) {
        console.error('Error fetching unique Lot_id:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/datetime_range/:start_timestamp/:end_timestamp', async (req, res) => {
    const { start_timestamp, end_timestamp } = req.params;

    try {
        const sql = `
            SELECT * FROM countrecords_counttray 
            WHERE Timestamp BETWEEN ? AND ?
        `;
        const [results] = await connection.promise().query(sql, [start_timestamp, end_timestamp]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching records by datetime range:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/countrecords_counttray/:Business_id/datetime_range/:start_timestamp/:end_timestamp', async (req, res) => {
    const { Business_id, start_timestamp, end_timestamp } = req.params;

    try {
        const sql = `
            SELECT * FROM countrecords_counttray 
            WHERE Business_id = ? AND Timestamp BETWEEN ? AND ?
        `;
        const [results] = await connection.promise().query(sql, [Business_id, start_timestamp, end_timestamp]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching records by datetime range and Business_id:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/Lot_idData/countrecords_counttray', async (req, res) => {
    try {
        await connectToDatabase();
        const query = `SELECT cr.Lot_id
                       FROM countrecords_counttray cr
                       INNER JOIN (
                           SELECT Lot_id, MAX(count_id) as MaxCountId
                           FROM countrecords_counttray
                           GROUP BY Lot_id
                       ) as subquery ON cr.Lot_id = subquery.Lot_id AND cr.count_id = subquery.MaxCountId
                       ORDER BY subquery.MaxCountId DESC`;
        connection.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/Lot_idData/countrecords', async (req, res) => {
    try {
        await connectToDatabase();
        const query = `SELECT cr.Lot_id
                       FROM countrecords cr
                       INNER JOIN (
                           SELECT Lot_id, MAX(count_id) as MaxCountId
                           FROM countrecords
                           GROUP BY Lot_id
                       ) as subquery ON cr.Lot_id = subquery.Lot_id AND cr.count_id = subquery.MaxCountId
                       ORDER BY subquery.MaxCountId DESC`;
        connection.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(process.env.PORT || 3334, () => {
    console.log(`Server running on port ${process.env.PORT || 3334}`);
});
