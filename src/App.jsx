import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import "./App.css";

function App() {
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);

  const key = "C7+fLbylnfIv/s/V1dZ/Vz1xdSwOjFEF+WYRklx5aZQ=";

  async function getUsers() {
    try {
      const db = await Database.load("sqlite:test3.db");
      const dbUsers = await db.select("SELECT * FROM users");

      if (!key) throw new Error("Encryption key missing");

      console.log("dbUsers", dbUsers);
      const decryptedUsers = await Promise.all(
        dbUsers.map(async (user) => ({
          ...user,
          amount: user.amount
            ? await invoke("decrypt_data", {
                encryptedData: user.amount,
                key,
              })
            : "",
        }))
      );

      setUsers(decryptedUsers);
      setError("");
      setIsLoadingUsers(false);
    } catch (error) {
      console.error(error);
      setError("Failed to get users - check console");
      setIsLoadingUsers(false);
    }
  }

  async function setUser(user) {
    try {
      console.log("start insert");
      setIsLoadingUsers(true);
      const db = await Database.load("sqlite:test3.db");

      if (!key) throw new Error("Encryption key missing");

      const encryptedAmount = await invoke("encrypt_data", {
        data: user.number || "",
        key,
      });

      console.log("encryptedAmount", encryptedAmount);
      await db.execute(
        "INSERT INTO users (name, email, amount) VALUES ($1, $2, $3)",
        [user.name, user.email, encryptedAmount]
      );

      await getUsers();
      resetForm();
    } catch (error) {
      console.error(error);
      setError("Failed to insert user - check console");
      setIsLoadingUsers(false);
    }
  }

  async function updateUser(user) {
    try {
      setIsLoadingUsers(true);
      const db = await Database.load("sqlite:test3.db");

      const fields = [];
      const values = [];
      let idx = 1;

      if (user.name !== "") {
        fields.push(`name = $${idx++}`);
        values.push(user.name);
      }
      if (user.email !== "") {
        fields.push(`email = $${idx++}`);
        values.push(user.email);
      }
      if (user.number !== "") {
        const encryptedAmount = await invoke("encrypt_data", {
          data: user.number,
          key,
        });
        fields.push(`amount = $${idx++}`);
        values.push(encryptedAmount);
      }

      if (fields.length === 0) {
        setIsLoadingUsers(false);
        return;
      }

      values.push(user.id);
      const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}`;

      await db.execute(sql, values);

      await getUsers();
      resetForm();
    } catch (error) {
      console.error(error);
      setError("Failed to update user - check console");
      setIsLoadingUsers(false);
    }
  }

  async function deleteUser(id) {
    try {
      setIsLoadingUsers(true);
      const db = await Database.load("sqlite:test3.db");
      await db.execute("DELETE FROM users WHERE id = $1", [id]);
      await getUsers();
      setIsLoadingUsers(false);
    } catch (error) {
      console.error(error);
      setError("Failed to delete user - check console");
      setIsLoadingUsers(false);
    }
  }

  function resetForm() {
    setEditingUserId(null);
    setName("");
    setEmail("");
    setNumber("");
    setIsLoadingUsers(false);
  }

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <main className="container">
      <h1>Tauri + Vite + SQLite</h1>

      {isLoadingUsers ? (
        <div>Loading users...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (editingUserId !== null) {
                updateUser({ id: editingUserId, name, email, number });
              } else {
                setUser({ name, email, number });
              }
            }}
          >
            <input
              id="name-input"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name..."
            />
            <input
              type="email"
              id="email-input"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="Enter an email..."
            />
            <input
              type="number"
              step="0.01"
              min="0"
              id="amount-input"
              value={number}
              onChange={(e) => setNumber(e.currentTarget.value)}
              placeholder="Enter an Amount..."
            />
            <button type="submit">
              {editingUserId !== null ? "Update User" : "Add User"}
            </button>

            {editingUserId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={{ backgroundColor: "#ccc", color: "black" }}
              >
                Cancel
              </button>
            )}
          </form>

          <div>
            <h2>Users</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.amount}</td>
                    <td>
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setName(user.name || "");
                          setEmail(user.email || "");
                          setNumber(user.amount || "");
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this user?"
                            )
                          ) {
                            deleteUser(user.id);
                          }
                        }}
                        style={{
                          marginLeft: "0.5rem",
                          backgroundColor: "red",
                          color: "white",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}

export default App;
