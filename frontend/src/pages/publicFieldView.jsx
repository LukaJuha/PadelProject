import { useState, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { Field, Booking, Reservation } from "../models";
import { getBackendURL } from '../utils/api';

function PublicFieldView() {
  const [user] = useContext(UserContext);
  const { clubId, fieldId } = useParams();
  const navigate = useNavigate();

  const [field, setField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [rawBookings, setRawBookings] = useState([]);
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('IN_PERSON');
  const [repeating, setRepeating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isCurrentWeek, setIsCurrentWeek] = useState(true);
  const [currentViewStart, setCurrentViewStart] = useState(null);
  const [showSubscriptions, setShowSubscriptions] = useState({});
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchFieldData();
    fetchBookings();
    fetchReservations();
  }, [clubId, fieldId]);

  const fetchFieldData = async () => {
    try {
      const backendURL = getBackendURL();
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
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/fields/${fieldId}/bookings/public/`);

      if (res.ok) {
        const data = await res.json();
        setRawBookings(data.bookings || []);
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
            extendedProps: {
              price: booking.price,
              subscriptionOnly: booking.subscriptionOnly
            }
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
      const backendURL = getBackendURL();
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

  const handleDatesSet = (info) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const viewStart = new Date(info.start);
    viewStart.setHours(0, 0, 0, 0);
    setCurrentViewStart(viewStart);
    setIsCurrentWeek(viewStart.getTime() === today.getTime());
  };

  const computeDateForBooking = (booking) => {
    if (booking?.date) return booking.date;
    const weekStart = currentViewStart
      ? new Date(currentViewStart)
      : (() => {
          const today = new Date();
          const offset = (today.getDay() + 6) % 7; // make Monday the start
          today.setDate(today.getDate() - offset);
          today.setHours(0, 0, 0, 0);
          return today;
        })();
    const fcDow = booking?.daysOfWeek?.[0] ?? 0;
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + fcDow);
    return date.toISOString().split('T')[0];
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

    const bookingDate = computeDateForBooking(booking);
    setSelectedBooking({ 
      ...booking, 
      date: bookingDate,
      subscriptions: rawBookings.find(b => b.id === booking.id)?.subscriptions || [],
      subscription_only: rawBookings.find(b => b.id === booking.id)?.subscription_only || false
    });
    setRepeating(false);
    setShowReserveForm(true);
  };

  const handleEventClick = (info) => {
    const event = info.event;
    const eventDate = info.event.start;
    
    if (!user) {
      alert("Molim vas prijavite se kako biste rezervirali termin");
      navigate("/login");
      return;
    }

    if (user.role !== 'PLAYER') {
      alert("Samo igrači mogu rezervirati termine");
      return;
    }

    // Create booking object with selected date - use event.extendedProps for price
    const booking = {
      id: event.id,
      title: event.title,
      date: eventDate.toISOString().split('T')[0],
      price: event.extendedProps?.price || 0
    };

    setSelectedBooking(booking);
    setRepeating(false);
    setShowReserveForm(true);
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();

    // For PayPal payment, the PayPal button will handle the submission
    if (paymentMethod === 'PAYPAL') {
      return;
    }

    // For IN_PERSON payment, proceed with normal reservation
    await createReservation('IN_PERSON');
  };

  const createReservation = async (paymentMethodValue, paypalOrderId = null) => {
    try {
      const backendURL = getBackendURL();
      if (!selectedBooking || !selectedBooking.date) {
        alert('Molimo odaberite konkretan datum termina na kalendaru prije rezervacije.');
        return;
      }

      const res = await fetch(`${backendURL}/fields/${fieldId}/reserve/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          date: selectedBooking.date,
          repeating,
          payment_method: paymentMethodValue,
          paypal_order_id: paypalOrderId,
        }),
      });

      if (res.ok) {
        alert("Termin uspješno rezerviran!");
        setShowReserveForm(false);
        setSelectedBooking(null);
        setRepeating(false);
        setPaymentMethod('IN_PERSON');
        setProcessingPayment(false);
        fetchReservations();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri rezervaciji termina");
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error("Error reserving booking:", error);
      alert("Greška pri rezervaciji termina");
      setProcessingPayment(false);
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
          {isCurrentWeek && (
            <style>{`
              .fc .fc-button-group > :first-child {
                opacity: 0.5;
                cursor: not-allowed !important;
                pointer-events: none;
              }
            `}</style>
          )}
          <FullCalendar
            ref={calendarRef}
            locale="hr"
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            datesSet={handleDatesSet}
            events={bookings}
            eventClick={handleEventClick}
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
                const rawBooking = rawBookings.find(b => b.id === booking.id);
                const hasSubscriptions = rawBooking && rawBooking.subscriptions && rawBooking.subscriptions.length > 0;
                
                return (
                  <li key={booking.id} style={styles.bookingItem}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{booking.title}</strong> - {dayNames[dayIndex]} {booking.startTime}-{booking.endTime}
                          {isReserved && <span style={{ color: '#28a745', marginLeft: '10px' }}>(Rezervirano)</span>}
                          {rawBooking.subscription_only && (
                            <span style={{ color: '#ff6b6b', marginLeft: '10px', fontSize: '12px' }}>
                              ⚠️ Samo za pretplatnike
                            </span>
                          )}
                          <div style={{ fontSize: '14px', color: '#666', marginTop: '3px' }}>
                            Cijena: <strong>{parseFloat(booking.price || 0).toFixed(2)}€</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {hasSubscriptions && (
                            <button
                              type="button"
                              style={styles.crownButton}
                              onClick={() => setShowSubscriptions(prev => ({ ...prev, [booking.id]: !prev[booking.id] }))}
                              title="Prikaži pretplate"
                            >
                              <img src="/crown.png" alt="pretplate" style={{ width: '20px', height: '20px' }} />
                            </button>
                          )}
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
                      </div>
                      {showSubscriptions[booking.id] && hasSubscriptions && (
                        <div style={styles.subscriptionsList}>
                          <strong>Pretplate s popustom:</strong>
                          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                            {rawBooking.subscriptions.map(sub => (
                              <li key={sub.id} style={{ marginBottom: '5px' }}>
                                {sub.name} - <span style={{ color: '#28a745', fontWeight: 'bold' }}>{sub.discount_percentage}% popust</span>
                              </li>
                            ))}
                          </ul>
                        </div>
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

              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
                <strong style={{ fontSize: '18px', color: '#28a745' }}>Cijena: {selectedBooking.price?.toFixed(2)}€</strong>
              </div>

              {selectedBooking.subscription_only && selectedBooking.subscriptions && selectedBooking.subscriptions.length > 0 && (
                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px' }}>
                    ⚠️ Ovaj termin zahtijeva jednu od sljedećih pretplata:
                  </div>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#856404' }}>
                    {selectedBooking.subscriptions.map(sub => (
                      <li key={sub.id}>{sub.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={repeating}
                    onChange={(e) => setRepeating(e.target.checked)}
                    disabled={processingPayment}
                  />
                  <span>Rezervacija se ponavlja svaki tjedan</span>
                </label>
                <small style={{ color: '#666' }}>Ponavljajuća rezervacija blokira ovaj termin svakog tjedna dok je ne otkažete.</small>
              </div>
              
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Način plaćanja:
                </label>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="radio"
                    id="payInPerson"
                    name="paymentMethod"
                    value="IN_PERSON"
                    checked={paymentMethod === 'IN_PERSON'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                    disabled={processingPayment}
                  />
                  <label htmlFor="payInPerson">Platiti osobno u klubu</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="payPaypal"
                    name="paymentMethod"
                    value="PAYPAL"
                    checked={paymentMethod === 'PAYPAL'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                    disabled={processingPayment}
                  />
                  <label htmlFor="payPaypal">Platiti putem PayPal-a</label>
                </div>
              </div>

              {paymentMethod === 'PAYPAL' ? (
                <div style={{ marginBottom: '15px' }}>
                  {processingPayment && (
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px' }}>
                      Procesiranje plaćanja...
                    </p>
                  )}
                  <PayPalButtons
                    style={{ layout: 'vertical' }}
                    createOrder={(data, actions) => {
                      setProcessingPayment(true);
                      const price = selectedBooking?.price ? parseFloat(selectedBooking.price).toFixed(2) : '0.00';
                      return actions.order.create({
                        purchase_units: [{
                          amount: {
                            value: price,
                            currency_code: 'EUR'
                          },
                          description: `Rezervacija: ${selectedBooking.title}`
                        }]
                      });
                    }}
                    onApprove={async (data, actions) => {
                      const order = await actions.order.capture();
                      await createReservation('PAYPAL', order.id);
                    }}
                    onError={(err) => {
                      console.error('PayPal error:', err);
                      alert('Greška pri obradi PayPal plaćanja');
                      setProcessingPayment(false);
                    }}
                    onCancel={() => {
                      setProcessingPayment(false);
                    }}
                  />
                  <button 
                    type="button"
                    style={{ ...styles.button, backgroundColor: '#6c757d', width: '100%', marginTop: '10px' }}
                    onClick={() => { setShowReserveForm(false); setPaymentMethod('IN_PERSON'); setProcessingPayment(false); }}
                    disabled={processingPayment}
                  >
                    Odustani
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={styles.submitButton} disabled={processingPayment}>
                    Potvrdi Rezervaciju
                  </button>
                  <button 
                    type="button"
                    style={{ ...styles.button, backgroundColor: '#6c757d' }}
                    onClick={() => { setShowReserveForm(false); setPaymentMethod('IN_PERSON'); setProcessingPayment(false); }}
                    disabled={processingPayment}
                  >
                    Odustani
                  </button>
                </div>
              )}
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
  },
  crownButton: {
    padding: "5px 10px",
    backgroundColor: "#ffc107",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionsList: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    fontSize: "14px",
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
