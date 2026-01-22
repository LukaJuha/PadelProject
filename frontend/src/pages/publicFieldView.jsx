import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Field, Booking, Reservation } from "../models";

function PublicFieldView() {
  const [user] = useContext(UserContext);
  const { clubId, fieldId } = useParams();
  const navigate = useNavigate();

  const [field, setField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reservations, setReservations] = useState([]);

  const backendURL = (import.meta.env.MODE === 'development') ? 
    import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

  useEffect(() => {
    fetchFieldData();
    fetchBookings();
    fetchReservations();
  }, [clubId, fieldId]);

  const fetchFieldData = async () => {
    try {
      const res = await fetch(`${backendURL}/fields/${fieldId}/public/`, {
        method: "GET",
      });

      if (res.ok) {
        const data = await res.json();
        setField(Field.fromAPI(data.field));
      } else {
        alert("Greška pri učitavanju terena");
        navigate("/");
      }
    } catch (error) {
      console.error("Error fetching field:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/public/`);

      if (res.ok) {
        const data = await res.json();
        const bookingModels = (data.bookings || []).map(b => Booking.fromAPI(b));
        const events = bookingModels.map((booking) => {
          const dayOfWeek = booking.dayOfWeek === 0 ? 6 : booking.dayOfWeek - 1;
          
          return {
            id: booking.id,
            title: booking.title,
            daysOfWeek: [dayOfWeek],
            startTime: booking.startTime,
            endTime: booking.endTime,
            backgroundColor: "#28a745",
            borderColor: "#1e7e34",
          };
        });
        setBookings(events);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchReservations = async () => {
    if (!user?.accessToken) return;

    try {
      const res = await fetch(`${backendURL}/fields/${fieldId}/reservations/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const handleReserveBooking = (booking) => {
    if (!user) {
      alert("Molim vas prijavite se kako biste rezervirali termin");
      navigate("/login");
      return;
    }

    if (user.role !== 'PLAYER') {
      alert("Samo igrači mogu rezervirati termine");
      return;
    }

    setSelectedBooking(booking);
    setShowReserveForm(true);
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${backendURL}/fields/${fieldId}/reserve/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
        }),
      });

      if (res.ok) {
        alert("Termin uspješno rezerviran!");
        setShowReserveForm(false);
        setSelectedBooking(null);
        fetchReservations();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri rezervaciji termina");
      }
    } catch (error) {
      console.error("Error reserving booking:", error);
      alert("Greška pri rezervaciji termina");
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
            {field.floor_type || field.floorType} • {field.size} • {field.location}
          </p>
        </div>
        <button 
          style={styles.backButton}
          onClick={() => navigate(`/club/${clubId}`)}
        >
          Nazad na Klub
        </button>
      </div>

      <div style={styles.section}>
        <h2>Tjedni Raspored</h2>
        <div style={styles.calendarContainer}>
          <FullCalendar
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
            height="auto"
            allDaySlot={false}
            editable={false}
            eventColor="#007bff"
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Dostupni Termini</h2>
        </div>

        <div style={styles.bookingsList}>
          {bookings.length === 0 ? (
            <p>Nema dostupnih termina u ovom trenutku.</p>
          ) : (
            <ul>
              {bookings.map((booking) => {
                const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
                const dayIndex = booking.daysOfWeek[0] === 6 ? 0 : booking.daysOfWeek[0] + 1;
                const isReserved = reservations.some(r => r.booking_id === booking.id);
                
                return (
                  <li key={booking.id} style={styles.bookingItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>{booking.title}</strong> - {dayNames[dayIndex]} {booking.startTime}-{booking.endTime}
                        {isReserved && <span style={{ color: '#28a745', marginLeft: '10px' }}>(Rezervirano)</span>}
                      </span>
                      {!isReserved && user?.role === 'PLAYER' && (
                        <button
                          type="button"
                          style={{ ...styles.button, padding: '5px 10px', fontSize: '12px', backgroundColor: '#28a745' }}
                          onClick={() => handleReserveBooking(booking)}
                        >
                          Rezerviraj
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showReserveForm && selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setShowReserveForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Potvrdi Rezervaciju</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowReserveForm(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitReservation}>
              <p style={{ marginBottom: '15px' }}>
                Sigurno želite rezervirati <strong>{selectedBooking.title}</strong>?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={styles.submitButton}>
                  Potvrdi Rezervaciju
                </button>
                <button 
                  type="button"
                  style={{ ...styles.button, backgroundColor: '#6c757d' }}
                  onClick={() => setShowReserveForm(false)}
                >
                  Odustani
                </button>
              </div>
            </form>
          </div>
        </div>
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
  backButton: {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
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
  modalOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "1000",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "400px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  closeButton: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#6c757d",
  },
};

export default PublicFieldView;
