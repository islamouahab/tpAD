import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def get_kafka_producer():
    try:
        from kafka import KafkaProducer
        producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            api_version=(0, 10, 1)
        )
        return producer
    except Exception as e:
        logger.warning(f"Kafka producer not available: {e}")
        return None

def publish_prescription_event(prescription):
    from .models import User, Notification
    
    message = {
        'prescription_id': prescription.id,
        'patient_id': prescription.patient.id,
        'patient_name': str(prescription.patient),
        'doctor_id': prescription.doctor.id if prescription.doctor else None,
        'doctor_name': f"Dr. {prescription.doctor.first_name} {prescription.doctor.last_name}" if prescription.doctor else "Unknown",
        'medications': prescription.medications,
        'created_at': prescription.created_at.isoformat(),
    }
    
    producer = get_kafka_producer()
    if producer:
        try:
            producer.send(settings.KAFKA_TOPIC_PRESCRIPTIONS, message)
            producer.flush()
            logger.info(f"Published prescription event for prescription {prescription.id}")
        except Exception as e:
            logger.error(f"Failed to publish prescription event: {e}")
            create_notifications_sync(prescription)
    else:
        logger.info("Kafka not available, creating notifications synchronously")
        create_notifications_sync(prescription)

def create_notifications_sync(prescription):
    from .models import User, Notification
    
    pharmacists = User.objects.filter(role='pharmacist')
    nurses = User.objects.filter(role='nurse')
    
    notification_message = f"New prescription #{prescription.id} for {prescription.patient} by Dr. {prescription.doctor.first_name} {prescription.doctor.last_name if prescription.doctor else 'Unknown'}"
    
    notifications = []
    for user in list(pharmacists) + list(nurses):
        notifications.append(Notification(
            recipient=user,
            message=notification_message,
            prescription=prescription
        ))
    
    Notification.objects.bulk_create(notifications)
    logger.info(f"Created {len(notifications)} notifications for prescription {prescription.id}")
