import json
import logging
from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Consumes prescription messages from Kafka and creates notifications'

    def handle(self, *args, **options):
        from api.models import User, Notification, Prescription
        
        try:
            from kafka import KafkaConsumer
        except ImportError:
            self.stdout.write(self.style.ERROR('kafka-python is not installed'))
            return
        
        self.stdout.write(self.style.SUCCESS('Starting Kafka consumer for new_prescriptions topic...'))
        
        try:
            consumer = KafkaConsumer(
                settings.KAFKA_TOPIC_PRESCRIPTIONS,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest',
                group_id='emr-notification-consumer',
                api_version=(0, 10, 1)
            )
            
            self.stdout.write(self.style.SUCCESS('Connected to Kafka. Waiting for messages...'))
            
            for message in consumer:
                try:
                    data = message.value
                    self.stdout.write(f"Received prescription event: {data}")
                    
                    prescription_id = data.get('prescription_id')
                    patient_name = data.get('patient_name')
                    doctor_name = data.get('doctor_name')
                    
                    try:
                        prescription = Prescription.objects.get(id=prescription_id)
                    except Prescription.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'Prescription {prescription_id} not found'))
                        continue
                    
                    pharmacists = User.objects.filter(role='pharmacist')
                    nurses = User.objects.filter(role='nurse')
                    
                    notification_message = f"New prescription #{prescription_id} for {patient_name} by {doctor_name}"
                    
                    notifications = []
                    for user in list(pharmacists) + list(nurses):
                        if not Notification.objects.filter(
                            recipient=user, 
                            prescription=prescription
                        ).exists():
                            notifications.append(Notification(
                                recipient=user,
                                message=notification_message,
                                prescription=prescription
                            ))
                    
                    if notifications:
                        Notification.objects.bulk_create(notifications)
                        self.stdout.write(self.style.SUCCESS(
                            f'Created {len(notifications)} notifications for prescription {prescription_id}'
                        ))
                    else:
                        self.stdout.write(f'Notifications already exist for prescription {prescription_id}')
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error processing message: {e}'))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to connect to Kafka: {e}'))
            self.stdout.write(self.style.WARNING('Make sure Kafka is running and accessible.'))
