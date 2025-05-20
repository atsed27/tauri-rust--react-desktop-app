import { useEffect, useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./App.css";

function App() {
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");

  async function getUsers() {
    try {
      const db = await Database.load("sqlite:test1.db");
      const dbUsers = await db.select("SELECT * FROM users");
      console.log("get user from db", dbUsers);
      setError("");
      setUsers(dbUsers);
      setIsLoadingUsers(false);
    } catch (error) {
      console.log(error);
      setError("Failed to get users - check console");
    }
  }

  async function setUser(user) {
    try {
      setIsLoadingUsers(true);
      const db = await Database.load("sqlite:test1.db");
      console.log("user", user);
      await db.execute(
        "INSERT INTO users (name, email, amount) VALUES ($1, $2, $3)",
        [user.name, user.email, user?.number]
      );

      getUsers().then(() => setIsLoadingUsers(false));
    } catch (error) {
      console.log(error);
      setError("Failed to insert user - check console");
    }
  }

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <main className="container">
      <h1> Tauri +Vite + SQLite</h1>

      {isLoadingUsers ? (
        <div>Loading users...</div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              setUser({ name, email, number });
              getUsers();
            }}
          >
            <input
              id="name-input"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name..."
            />
            <input
              type="email"
              id="email-input"
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="Enter an email..."
            />

            <input
              type="number"
              step="0.01"
              min="0"
              id="amount-input"
              onChange={(e) => setNumber(e.currentTarget.value)}
              placeholder="Enter an Amount..."
            />

            <button type="submit">Add User</button>
          </form>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <h1>Users</h1>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p>{error}</p>}
    </main>
  );
}

export default App;
