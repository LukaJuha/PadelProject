import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";

function Reservations() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendURL = (import.meta.env.MODE === 'development') ? 
    import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${backendURL}/reservations/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Convert reservations to calendar events
        const events = (data.reservations || []).map((reservation) => {
          const dayOfWeek = reservation.day_of_week === 0 ? 6 : reservation.day_of_week - 1;
          
          return {
            id: reservation.id,
            title: `${reservation.field_name} - ${reservation.booking_title}`,
            daysOfWeek: [dayOfWeek],
            startTime: reservation.start_time,
            endTime: reservation.end_time,
            backgroundColor: "#28a745",
            borderColor: "#1e7e34",
            extendedProps: {
              clubId: reservation.club_id,
              fieldId: reservation.field_id,
              clubName: reservation.club_name,
            }
          };
        });
        setReservations(events);
      } else {
        alert("Greška pri učitavanju rezervacija");
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      alert("Greška pri učitavanju rezervacija");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!confirm("Sigurno želite otkazati ovu rezervaciju?")) {
      return;
    }

    try {
      const res = await fetch(`${backendURL}/reservations/${reservationId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        alert("Rezervacija uspješno otkazana!");
        fetchReservations();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri otkazivanju rezervacije");
      }
    } catch (error) {
      console.error("Error deleting reservation:", error);
      alert("Greška pri otkazivanju rezervacije");
    }
  };

  const handleEventClick = (info) => {
    const { clubId, fieldId, clubName } = info.event.extendedProps;
    const title = info.event.title;
    
    if (confirm(`${title}\n\nŽelite li otkazati ovu rezervaciju?`)) {
      handleDeleteReservation(info.event.id);
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Moje Rezervacije</h1>
      </div>

      <div style={styles.section}>
        <h2>Tjedni Pregled</h2>
        <div style={styles.calendarContainer}>
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={reservations}
            slotLabelInterval="01:00"
            slotLabelFormat={{
              meridiem: false,
              hour: "2-digit",
              minute: "2-digit",
            }}
            height="auto"
            allDaySlot={false}
            editable={false}
            eventClick={handleEventClick}
          />
        </div>
      </div>

      {reservations.length === 0 ? (
        <div style={styles.emptyState}>
          <p>Nemate aktivnih rezervacija.</p>
          <button 
            style={styles.button}
            onClick={() => navigate("/search")}
          >
            Pretraži Terene
          </button>
        </div>
      ) : (
        <div style={styles.section}>
          <h2>Lista Rezervacija</h2>
          <div style={styles.reservationsList}>
            <ul>
              {reservations.map((reservation) => {
                const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
                const dayIndex = reservation.daysOfWeek[0] === 6 ? 0 : reservation.daysOfWeek[0] + 1;
                
                return (
                  <li key={reservation.id} style={styles.reservationItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{reservation.title}</strong>
                        <br />
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          {dayNames[dayIndex]} {reservation.startTime}-{reservation.endTime}
                        </span>
                      </div>
                      <button
                        type="button"
                        style={{ ...styles.button, padding: '5px 10px', fontSize: '12px', backgroundColor: '#dc3545' }}
                        onClick={() => handleDeleteReservation(reservation.id)}
                      >
                        Otkaži
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
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
    marginBottom: "30px",
    borderBottom: "2px solid #dee2e6",
    paddingBottom: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  section: {
    marginBottom: "40px",
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
  reservationsList: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  reservationItem: {
    padding: "10px",
    borderBottom: "1px solid #dee2e6",
    listStyleType: "none",
  },
};

export default Reservations;
