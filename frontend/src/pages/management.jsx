import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import { Field } from "../models";

function Management() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState({
    name: "",
    floorType: "HARDWOOD",
    size: "SINGLE",
    location: "INSIDE",
    ceilingHeight: "",
    lighting: true,
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const backendURL = (import.meta.env.MODE === 'development') ? 
        import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
      
      const res = await fetch(`${backendURL}/fields/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFields((data.fields || []).map(f => Field.fromAPI(f)));
      } else {
        console.error("Failed to fetch fields");
      }
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    
    const fieldModel = new Field({
      name: newField.name,
      floorType: newField.floorType,
      size: newField.size,
      location: newField.location,
      ceilingHeight: newField.ceilingHeight ? parseInt(newField.ceilingHeight) : null,
      lighting: newField.lighting
    });
    
    try {
      const backendURL = (import.meta.env.MODE === 'development') ? 
        import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

      const res = await fetch(`${backendURL}/fields/create/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fieldModel.toAPI()),
      });

      if (res.ok) {
        const data = await res.json();
        alert("Teren uspješno dodan!");
        setFields([...fields, Field.fromAPI(data.field)]);
        setShowAddForm(false);
        setNewField({
          name: "",
          floorType: "HARDWOOD",
          size: "SINGLE",
          location: "INSIDE",
          ceilingHeight: "",
          lighting: true,
        });
      } else {
        const data = await res.json();
        alert(data.error || "Greška prilikom dodavanja terena");
      }
    } catch (error) {
      console.error("Error adding field:", error);
      alert("Greška prilikom dodavanja terena");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Upravljanje terenima</h1>

      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <>
          <div style={styles.header}>
            <h2>Vaši Tereni ({fields.length})</h2>
            <button 
              style={styles.addButton}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Odustani" : "+ Dodaj Novi Teren"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddField} style={styles.form}>
              <h3>Dodaj Novi Teren</h3>
              
              <div style={styles.formGroup}>
                <label>Naziv terena:</label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Tip podloge:</label>
                <select
                  value={newField.floorType}
                  onChange={(e) => setNewField({ ...newField, floorType: e.target.value })}
                  style={styles.select}
                >
                  <option value="HARDWOOD">Tvrdo drvo</option>
                  <option value="GRASS">Trava</option>
                  <option value="TURF">Travnjak</option>
                  <option value="ARTIFICIAL">Umjetna podloga</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Veličina:</label>
                <select
                  value={newField.size}
                  onChange={(e) => setNewField({ ...newField, size: e.target.value })}
                  style={styles.select}
                >
                  <option value="SINGLE">Pojedinačni</option>
                  <option value="DOUBLE">Dvostruki</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Lokacija:</label>
                <select
                  value={newField.location}
                  onChange={(e) => setNewField({ ...newField, location: e.target.value })}
                  style={styles.select}
                >
                  <option value="INSIDE">Unutra</option>
                  <option value="OUTSIDE">Vani</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Visina stropa (cm, opciono):</label>
                <input
                  type="number"
                  value={newField.ceilingHeight}
                  onChange={(e) => setNewField({ ...newField, ceilingHeight: e.target.value })}
                  style={styles.input}
                  placeholder="Ostavi prazno ako nije primjenjivo"
                />
              </div>

              <div style={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={newField.lighting}
                    onChange={(e) => setNewField({ ...newField, lighting: e.target.checked })}
                  />
                  {" "}Osvjetljenje
                </label>
              </div>

              <button type="submit" style={styles.submitButton}>
                Spremi Teren
              </button>
            </form>
          )}

          <div style={styles.fieldsList}>
            {fields.length === 0 ? (
              <p>Nemate dodanih terena. Kliknite "Dodaj Novi Teren" za početak.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Naziv</th>
                    <th style={styles.th}>Tip podloge</th>
                    <th style={styles.th}>Veličina</th>
                    <th style={styles.th}>Lokacija</th>
                    <th style={styles.th}>Visina stropa (cm)</th>
                    <th style={styles.th}>Osvjetljenje</th>
                    <th style={styles.th}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.id}>
                      <td style={styles.td}>{field.name}</td>
                      <td style={styles.td}>{Field.FLOOR_TYPES_HR[field.floorType] || field.floorType}</td>
                      <td style={styles.td}>{Field.SIZES_HR[field.size] || field.size}</td>
                      <td style={styles.td}>{Field.LOCATIONS_HR[field.location] || field.location}</td>
                      <td style={styles.td}>{field.ceilingHeight || '-'}</td>
                      <td style={styles.td}>{Field.LIGHTING_HR[field.lighting]}</td>
                      <td style={styles.td}>
                        <button
                          style={styles.actionButton}
                          onClick={() => navigate(`/management/field/${field.id}`)}
                        >
                          Detaljno
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  addButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
  form: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "30px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  submitButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "10px",
  },
  fieldsList: {
    marginTop: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "12px",
    textAlign: "left",
    borderBottom: "2px solid #0056b3",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #dee2e6",
  },
  actionButton: {
    padding: "5px 10px",
    backgroundColor: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default Management;
