import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Field, Booking } from "../models";
import { getBackendURL } from '../utils/api';

function FieldDetail() {
  const [user] = useContext(UserContext);
  const { fieldId } = useParams();
  const navigate = useNavigate();

  const [field, setField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [showEditField, setShowEditField] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [newBooking, setNewBooking] = useState({
    title: "",
    dayOfWeek: 1, // 1 = Monday, 0 = Sunday
    startTime: "09:00",
    endTime: "10:00",
    price: "",
    subscriptionIds: [],
    subscriptionOnly: false,
  });

  useEffect(() => {
    if (!user?.authenticated || user?.role?.toUpperCase() !== 'CLUB') {
      navigate("/login");
      return;
    }
    fetchFieldData();
    fetchBookings();
    fetchSubscriptions();
  }, [fieldId]);

  const fetchFieldData = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setField(Field.fromAPI(data.field));
      } else {
        alert("Greška pri učitavanju terena");
        navigate("/management");
      }
    } catch (error) {
      console.error("Error fetching field:", error);
      navigate("/management");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Convert bookings to calendar events
        const events = (data.bookings || []).map((booking) => {
          const dayOfWeek = booking.day_of_week === 0 ? 6 : booking.day_of_week - 1;
          
          return {
            id: booking.id,
            title: booking.title,
            dayOfWeek: booking.day_of_week,
            daysOfWeek: [dayOfWeek],
            startTime: booking.start_time,
            endTime: booking.end_time,
            subscriptionIds: booking.subscription_ids || [],
            subscriptionOnly: booking.subscription_only || false,
            price: booking.price || 0,
          };
        });
        setBookings(events);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/clubs/${user.userId}/offers/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Filter only subscription offers
        const subs = (data.offers || []).filter(o => o.offer_type === 'SUBSCRIPTION');
        setSubscriptions(subs);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const handleAddBooking = async (e) => {
    e.preventDefault();

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/create/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newBooking.title,
          day_of_week: parseInt(newBooking.dayOfWeek),
          start_time: newBooking.startTime,
          end_time: newBooking.endTime,
          price: parseFloat(newBooking.price),
          subscription_ids: newBooking.subscriptionIds,
          subscription_only: newBooking.subscriptionOnly,
        }),
      });

      if (res.ok) {
        alert("Termin uspješno dodan!");
        setNewBooking({
          title: "",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:00",
          price: "",
          subscriptionIds: [],
          subscriptionOnly: false,
        });
        setShowAddBooking(false);
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri dodavanju termina");
      }
    } catch (error) {
      console.error("Error adding booking:", error);
      alert("Greška pri dodavanju termina");
    }
  };

  const handleDeleteField = async () => {
    if (!confirm("Sigurno želite obrisati ovaj teren? Ovo je nepovratno.")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        alert("Teren uspješno obrisan!");
        navigate("/management");
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri brisanju terena");
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      alert("Greška pri brisanju terena");
    }
  };

  const handleEditField = () => {
    setEditingField({
      id: field.id,
      name: field.name,
      floorType: field.floorType,
      size: field.size,
      location: field.location,
      ceilingHeight: field.ceilingHeight || "",
      lighting: field.lighting,
      reservationFee: field.reservationFee || "",
    });
    setShowEditField(true);
  };

  const handleUpdateField = async (e) => {
    e.preventDefault();

    const fieldModel = new Field({
      name: editingField.name,
      floorType: editingField.floorType,
      size: editingField.size,
      location: editingField.location,
      ceilingHeight: editingField.ceilingHeight ? parseInt(editingField.ceilingHeight) : null,
      lighting: editingField.lighting,
      reservationFee: editingField.reservationFee ? parseFloat(editingField.reservationFee) : 0
    });

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${editingField.id}/update/`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fieldModel.toAPI()),
      });

      if (res.ok) {
        const data = await res.json();
        alert("Teren uspješno ažuriran!");
        setField(Field.fromAPI(data.field));
        setShowEditField(false);
        setEditingField(null);
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri ažuriranju terena");
      }
    } catch (error) {
      console.error("Error updating field:", error);
      alert("Greška pri ažuriranju terena");
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!confirm("Sigurno želite obrisati ovaj termin?")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/${bookingId}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        alert("Termin uspješno obrisan!");
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri brisanju termina");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Greška pri brisanju termina");
    }
  };

  const handleEditBooking = (booking) => {
    const dayOfWeek = booking.dayOfWeek;
    setEditingBooking({
      id: booking.id,
      title: booking.title,
      dayOfWeek: dayOfWeek,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: booking.price || "",
      subscriptionIds: booking.subscriptionIds || [],
      subscriptionOnly: booking.subscriptionOnly || false,
    });
    setShowEditBooking(true);
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/${editingBooking.id}/`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingBooking.title,
          day_of_week: parseInt(editingBooking.dayOfWeek),
          start_time: editingBooking.startTime,
          end_time: editingBooking.endTime,
          price: parseFloat(editingBooking.price),
          subscription_ids: editingBooking.subscriptionIds,
          subscription_only: editingBooking.subscriptionOnly,
        }),
      });

      if (res.ok) {
        alert("Termin uspješno ažuriran!");
        setShowEditBooking(false);
        setEditingBooking(null);
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri ažuriranju termina");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Greška pri ažuriranju termina");
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  if (!field) {
    return <p style={styles.container}>Teren nije pronađen</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>{field.name}</h1>
          <p style={styles.subtitle}>
            {Field.FLOOR_TYPES_HR[field.floorType]} • {Field.SIZES_HR[field.size]} • {Field.LOCATIONS_HR[field.location]}
          </p>
        </div>
        <div>
          <button style={{ ...styles.button, backgroundColor: "#dc3545" }} onClick={handleDeleteField}>
            Obriši Teren
          </button>
        </div>
      </div>

      {showEditField && editingField && (
        <form onSubmit={handleUpdateField} style={styles.form}>
          <div style={styles.sectionHeader}>
            <h2>Uredi Teren</h2>
            <button 
              type="button"
              style={{ ...styles.button, backgroundColor: '#6c757d', padding: '8px 16px' }}
              onClick={() => { setShowEditField(false); setEditingField(null); }}
            >
              Zatvori
            </button>
          </div>
          
          <div style={styles.formGroup}>
            <label>Naziv terena:</label>
            <input
              type="text"
              value={editingField.name}
              onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Tip podloge:</label>
            <select
              value={editingField.floorType}
              onChange={(e) => setEditingField({ ...editingField, floorType: e.target.value })}
              style={styles.select}
            >
              <option value="HARDWOOD">Hardwood</option>
              <option value="GRASS">Trava</option>
              <option value="TURF">Turf</option>
              <option value="ARTIFICIAL">Umjetna trava</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Veličina:</label>
              <select
                value={editingField.size}
                onChange={(e) => setEditingField({ ...editingField, size: e.target.value })}
                style={styles.select}
              >
                <option value="SINGLE">Single</option>
                <option value="DOUBLE">Double</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label>Lokacija:</label>
              <select
                value={editingField.location}
                onChange={(e) => setEditingField({ ...editingField, location: e.target.value })}
                style={styles.select}
              >
                <option value="INSIDE">Unutra</option>
                <option value="OUTSIDE">Vani</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Visina stropa (cm):</label>
              <input
                type="number"
                value={editingField.ceilingHeight}
                onChange={(e) => setEditingField({ ...editingField, ceilingHeight: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Naknada za otkazivanje (€):</label>
              <input
                type="number"
                step="0.01"
                value={editingField.reservationFee}
                onChange={(e) => setEditingField({ ...editingField, reservationFee: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={editingField.lighting}
                onChange={(e) => setEditingField({ ...editingField, lighting: e.target.checked })}
              />
              Osvjetljenje
            </label>
          </div>

          <button type="submit" style={styles.submitButton}>
            Spremi Promjene
          </button>
        </form>
      )}

      {!showEditField && (
        <div style={{ marginBottom: '30px' }}>
          <button 
            style={{ ...styles.button, backgroundColor: "#17a2b8" }} 
            onClick={handleEditField}
          >
            Uredi Teren
          </button>
        </div>
      )}

      <div style={styles.section}>
        <h2>Tjedni Raspored</h2>
        <div style={styles.calendarContainer}>
          <FullCalendar
            locale="hr"
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            events={bookings}
            slotLabelInterval="01:00"
            slotLabelFormat={{
              meridiem: false,
              hour: "2-digit",
              minute: "2-digit",
            }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false,
              hour12: false,
            }}
            height="auto"
            allDaySlot={false}
            editable={false}
            eventColor="#007bff"
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Termini</h2>
          <button
            style={styles.button}
            onClick={() => setShowAddBooking(!showAddBooking)}
          >
            {showAddBooking ? "Odustani" : "+ Dodaj Termin"}
          </button>
        </div>

        {showAddBooking && (
          <form onSubmit={handleAddBooking} style={styles.form}>
            <div style={styles.formGroup}>
              <label>Naziv termina:</label>
              <input
                type="text"
                value={newBooking.title}
                onChange={(e) => setNewBooking({ ...newBooking, title: e.target.value })}
                required
                style={styles.input}
                placeholder="npr. Članovi A"
              />
            </div>

            <div style={styles.formGroup}>
              <label>Dan u tjednu:</label>
              <select
                value={newBooking.dayOfWeek}
                onChange={(e) => setNewBooking({ ...newBooking, dayOfWeek: parseInt(e.target.value) })}
                style={styles.select}
              >
                <option value="1">Ponedjeljak</option>
                <option value="2">Utorak</option>
                <option value="3">Srijeda</option>
                <option value="4">Četvrtak</option>
                <option value="5">Petak</option>
                <option value="6">Subota</option>
                <option value="0">Nedjelja</option>
              </select>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Početak:</label>
                <input
                  type="time"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Završetak:</label>
                <input
                  type="time"
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Cijena (€):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBooking.price}
                  onChange={(e) => setNewBooking({ ...newBooking, price: e.target.value })}
                  required
                  style={styles.input}
                  placeholder="npr. 15.00"
                />
              </div>
            </div>

            {subscriptions.length > 0 && (
              <div style={styles.formGroup}>
                <label>Pretplate s popustom:</label>
                <div style={styles.checkboxContainer}>
                  {subscriptions.map(sub => (
                    <label key={sub.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newBooking.subscriptionIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewBooking({
                              ...newBooking,
                              subscriptionIds: [...newBooking.subscriptionIds, sub.id]
                            });
                          } else {
                            setNewBooking({
                              ...newBooking,
                              subscriptionIds: newBooking.subscriptionIds.filter(id => id !== sub.id)
                            });
                          }
                        }}
                      />
                      {sub.name} ({sub.discount_percentage}% popust)
                    </label>
                  ))}
                </div>
                {newBooking.subscriptionIds.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newBooking.subscriptionOnly}
                        onChange={(e) => setNewBooking({ ...newBooking, subscriptionOnly: e.target.checked })}
                      />
                      Samo igrači s odabranim pretplatama mogu rezervirati ovaj termin
                    </label>
                  </div>
                )}
              </div>
            )}

            <button type="submit" style={styles.submitButton}>
              Spremi Termin
            </button>
          </form>
        )}

        {showEditBooking && editingBooking && (
          <form onSubmit={handleUpdateBooking} style={styles.form}>
            <div style={styles.sectionHeader}>
              <h3>Uredi Termin</h3>
              <button 
                type="button"
                style={{ ...styles.button, backgroundColor: '#6c757d', padding: '5px 10px' }}
                onClick={() => { setShowEditBooking(false); setEditingBooking(null); }}
              >
                Zatvori
              </button>
            </div>

            <div style={styles.formGroup}>
              <label>Naziv termina:</label>
              <input
                type="text"
                value={editingBooking.title}
                onChange={(e) => setEditingBooking({ ...editingBooking, title: e.target.value })}
                required
                style={styles.input}
                placeholder="npr. Članovi A"
              />
            </div>

            <div style={styles.formGroup}>
              <label>Dan u tjednu:</label>
              <select
                value={editingBooking.dayOfWeek}
                onChange={(e) => setEditingBooking({ ...editingBooking, dayOfWeek: parseInt(e.target.value) })}
                style={styles.select}
              >
                <option value="1">Ponedjeljak</option>
                <option value="2">Utorak</option>
                <option value="3">Srijeda</option>
                <option value="4">Četvrtak</option>
                <option value="5">Petak</option>
                <option value="6">Subota</option>
                <option value="0">Nedjelja</option>
              </select>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Početak:</label>
                <input
                  type="time"
                  value={editingBooking.startTime}
                  onChange={(e) => setEditingBooking({ ...editingBooking, startTime: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Završetak:</label>
                <input
                  type="time"
                  value={editingBooking.endTime}
                  onChange={(e) => setEditingBooking({ ...editingBooking, endTime: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Cijena (€):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBooking.price}
                  onChange={(e) => setEditingBooking({ ...editingBooking, price: e.target.value })}
                  required
                  style={styles.input}
                  placeholder="npr. 15.00"
                />
              </div>
            </div>

            {subscriptions.length > 0 && (
              <div style={styles.formGroup}>
                <label>Pretplate s popustom:</label>
                <div style={styles.checkboxContainer}>
                  {subscriptions.map(sub => (
                    <label key={sub.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingBooking.subscriptionIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingBooking({
                              ...editingBooking,
                              subscriptionIds: [...editingBooking.subscriptionIds, sub.id]
                            });
                          } else {
                            setEditingBooking({
                              ...editingBooking,
                              subscriptionIds: editingBooking.subscriptionIds.filter(id => id !== sub.id)
                            });
                          }
                        }}
                      />
                      {sub.name} ({sub.discount_percentage}% popust)
                    </label>
                  ))}
                </div>
                {editingBooking.subscriptionIds.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingBooking.subscriptionOnly}
                        onChange={(e) => setEditingBooking({ ...editingBooking, subscriptionOnly: e.target.checked })}
                      />
                      Samo igrači s odabranim pretplatama mogu rezervirati ovaj termin
                    </label>
                  </div>
                )}
              </div>
            )}

            <button type="submit" style={styles.submitButton}>
              Spremi Promjene
            </button>
          </form>
        )}

        <div style={styles.bookingsList}>
          {bookings.length === 0 ? (
            <p>Nema dodanih termina. Kliknite "Dodaj Termin" za početak.</p>
          ) : (
            <ul>
              {bookings.map((booking) => {
                const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
                const dayIndex = booking.dayOfWeek;
                
                return (
                  <li key={booking.id} style={styles.bookingItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>{booking.title}</strong> - {dayNames[dayIndex]} {booking.startTime}-{booking.endTime}
                      </span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          type="button"
                          style={{ ...styles.button, padding: '5px 10px', fontSize: '12px', backgroundColor: '#17a2b8' }}
                          onClick={() => handleEditBooking(booking)}
                        >
                          Uredi
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.button, padding: '5px 10px', fontSize: '12px', backgroundColor: '#dc3545' }}
                          onClick={() => handleDeleteBooking(booking.id)}
                        >
                          Obriši
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
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
    alignItems: "flex-start",
    marginBottom: "30px",
    borderBottom: "2px solid #dee2e6",
    paddingBottom: "20px",
  },
  subtitle: {
    color: "#666",
    margin: "5px 0 0 0",
    fontSize: "14px",
  },
  section: {
    marginBottom: "40px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  form: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
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
  checkboxContainer: {
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "10px",
    backgroundColor: "white",
    maxHeight: "150px",
    overflowY: "auto",
  },
  checkboxLabel: {
    display: "block",
    marginBottom: "8px",
    cursor: "pointer",
  },
  bookingsList: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  bookingItem: {
    padding: "10px",
    borderBottom: "1px solid #dee2e6",
    listStyleType: "none",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};

export default FieldDetail;
