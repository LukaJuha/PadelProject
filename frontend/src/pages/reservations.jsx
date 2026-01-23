import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Reservation } from "../models";
import { getBackendURL } from '../utils/api';

function Reservations() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentViewStart, setCurrentViewStart] = useState(null);
  const [currentViewEnd, setCurrentViewEnd] = useState(null);

  useEffect(() => {
    if (!user?.authenticated || user?.role?.toUpperCase() !== 'PLAYER') {
      navigate("/login");
      return;
    }
    setLoading(false);
    // Initial fetch will be triggered by datesSet callback
  }, []);

  const fetchReservations = async (startDate = null, endDate = null) => {
    try {
      const backendURL = getBackendURL();
      let url = `${backendURL}/reservations/`;
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Convert reservations to model instances and then to calendar events
        const reservationModels = (data.reservations || []).map(r => Reservation.fromAPI(r));
        setReservations(reservationModels);
        
        const events = reservationModels.map((reservation) => {
          const event = reservation.toCalendarEvent();
          const isRepeating = Boolean(reservation.repeating);
          // Ensure repeating reservations only render from their start date onward
          const startRecur = isRepeating && reservation.date ? reservation.date : undefined;
          return {
            ...event,
            ...(startRecur ? { startRecur } : {}),
            title: `${reservation.fieldName} - ${reservation.bookingTitle}${isRepeating ? ' (ponavljajuća)' : ''}`,
            backgroundColor: isRepeating ? "#fd7e14" : "#28a745",
            borderColor: isRepeating ? "#e36209" : "#1e7e34"
          };
        });
        setCalendarEvents(events);
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
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/reservations/${reservationId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const refundAmount = data.refund_amount || 0;
        alert(`Rezervacija uspješno otkazana!\nPovrat novca: ${refundAmount.toFixed(2)}€`);
        // Re-fetch with current view dates
        if (currentViewStart && currentViewEnd) {
          fetchReservations(currentViewStart, currentViewEnd);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri otkazivanju rezervacije");
      }
    } catch (error) {
      console.error("Error deleting reservation:", error);
      alert("Greška pri otkazivanju rezervacije");
    }
  };

  const handleDatesSet = (dateInfo) => {
    // Convert to YYYY-MM-DD format
    const startDate = dateInfo.start.toISOString().split('T')[0];
    const endDate = dateInfo.end.toISOString().split('T')[0];
    
    setCurrentViewStart(startDate);
    setCurrentViewEnd(endDate);
    
    // Fetch reservations for the new date range
    if (user?.authenticated) {
      fetchReservations(startDate, endDate);
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
            locale="hr"
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            firstDay={1}
            events={calendarEvents}
            datesSet={handleDatesSet}
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
                const dayIndex = reservation.dayOfWeek;
                
                return (
                  <li key={reservation.id} style={styles.reservationItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{reservation.fieldName} - {reservation.bookingTitle}</strong>
                        {reservation.repeating && (
                          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#fd7e14', color: 'white', borderRadius: '4px', fontSize: '11px' }}>
                            Ponavljajuća
                          </span>
                        )}
                        <br />
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          {dayNames[dayIndex]} {reservation.startTime}-{reservation.endTime}
                        </span>
                        {reservation.repeating && reservation.date && (
                          <>
                            <br />
                            <span style={{ color: '#666', fontSize: '12px' }}>
                              Od datuma: {reservation.date}
                            </span>
                          </>
                        )}
                        <br />
                        <span style={{ color: '#888', fontSize: '12px' }}>
                          Plaćanje: {Reservation.PAYMENT_METHODS_HR[reservation.paymentMethod] || 'N/A'} | 
                          Status: {Reservation.PAYMENT_STATUS_HR[reservation.paymentStatus] || 'N/A'}
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
