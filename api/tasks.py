from celery import shared_task
from django.utils import timezone
from .models import Reservation, Notification


@shared_task
def send_club_reservation_notification(reservation_id):
    """Send in-app notification to club when reservation is created"""
    try:
        reservation = Reservation.objects.select_related(
            'booking__field__clubid__userid',
            'player__userid'
        ).get(id=reservation_id)
    except Reservation.DoesNotExist:
        return

    club_user = reservation.booking.field.clubid.userid
    player = reservation.player.userid
    field = reservation.booking.field
    booking = reservation.booking

    # Get day name
    dow_names = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"]
    dow = dow_names[booking.day_of_week] if 0 <= booking.day_of_week <= 6 else str(booking.day_of_week)
    print(f"Sending reservation notification to club {club_user.username} for reservation {reservation_id}")
    # Create in-app notification
    repeating_note = " (ponavljajuća)" if reservation.repeating else ""

    # Only create approval notification for IN_PERSON payments
    if reservation.payment_method == 'IN_PERSON':
        Notification.objects.create(
            userid=club_user,
            title=f"Rezervacija za {booking.title}{repeating_note}",
            message=(
                f"Igrač '{player.username}' je rezervirao termin za {field.name} "
                f"({dow} {booking.start_time.strftime('%H:%M')}-{booking.end_time.strftime('%H:%M')})."
                f"{ ' Rezervacija je ponavljajuća.' if reservation.repeating else ''} "
                f"Potrebno je odobriti ili odbiti ovu rezervaciju."
            ),
            reservation=reservation
        )
    else:
        # For PayPal payments, just send info notification
        Notification.objects.create(
            userid=club_user,
            title=f"Nova plaćena rezervacija: {booking.title}{repeating_note}",
            message=(
                f"Igrač '{player.username}' je rezervirao i platio termin za {field.name} "
                f"({dow} {booking.start_time.strftime('%H:%M')}-{booking.end_time.strftime('%H:%M')})."
                f"{ ' Rezervacija je ponavljajuća.' if reservation.repeating else ''}"
            )
        )


@shared_task
def send_player_reservation_reminder(reservation_id):
    """Send in-app notification to player 24h before reservation"""
    try:
        reservation = Reservation.objects.select_related(
            'booking__field',
            'player__userid'
        ).get(id=reservation_id)
    except Reservation.DoesNotExist:
        return

    player = reservation.player.userid
    field = reservation.booking.field
    booking = reservation.booking

    # Get day name
    dow_names = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"]
    dow = dow_names[booking.day_of_week] if 0 <= booking.day_of_week <= 6 else str(booking.day_of_week)

    Notification.objects.create(
        userid=player,
        title="Podsjetnik: Rezervacija za 24 sata",
        message=f"Vaša rezervacija '{booking.title}' na terenu {field.name} je za 24 sata ({dow} {booking.start_time.strftime('%H:%M')}-{booking.end_time.strftime('%H:%M')})."
    )


@shared_task
def move_reservation_to_history(reservation_id):
    """Archive a completed reservation to history (runs after booking ends)"""
    from .models import ReservationHistory
    
    try:
        reservation = Reservation.objects.get(id=reservation_id)
    except Reservation.DoesNotExist:
        return

    # Do not archive or delete repeating reservations; they represent ongoing weekly slots
    if reservation.repeating:
        return
    
    # Create history entry
    ReservationHistory.objects.create(
        booking=reservation.booking,
        player=reservation.player,
        booking_date=reservation.date,
        payment_method=reservation.payment_method,
        payment_status=reservation.payment_status,
        created_at=reservation.created_at
    )
    
    # Delete the reservation (it's now archived)
    reservation.delete()


@shared_task
def send_club_cancellation_notification(reservation_id, refund_amount):
    """Send in-app notification to club when player cancels reservation"""
    try:
        reservation = Reservation.objects.select_related(
            'booking__field__clubid__userid',
            'player__userid'
        ).get(id=reservation_id)
    except Reservation.DoesNotExist:
        return

    club_user = reservation.booking.field.clubid.userid
    player = reservation.player.userid
    field = reservation.booking.field
    booking = reservation.booking

    # Get day name
    dow_names = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"]
    dow = dow_names[booking.day_of_week] if 0 <= booking.day_of_week <= 6 else str(booking.day_of_week)
    
    repeating_note = " (ponavljajuća)" if reservation.repeating else ""

    Notification.objects.create(
        userid=club_user,
        title=f"Otkazana rezervacija: {booking.title}{repeating_note}",
        message=(
            f"Igrač '{player.username}' je otkazao rezervaciju za {field.name} "
            f"({dow} {booking.start_time.strftime('%H:%M')}-{booking.end_time.strftime('%H:%M')}). "
            f"Povrat novca: {refund_amount:.2f}€"
        )
    )
