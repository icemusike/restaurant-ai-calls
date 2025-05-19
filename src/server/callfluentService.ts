import axios from 'axios';
import { Reservation } from '../types';

interface CallfluentSettings {
  apiKey: string;
  apiEndpoint: string;
  callbackNumber: string;
  autoCallEnabled: boolean;
}

/**
 * Service to handle interactions with the CallFluent AI API
 */
export class CallfluentService {
  private settings: CallfluentSettings;

  constructor(settings: CallfluentSettings) {
    this.settings = settings;
  }

  /**
   * Trigger a confirmation call for a new reservation
   */
  async triggerConfirmationCall(reservation: Reservation): Promise<boolean> {
    if (!this.settings.autoCallEnabled || !this.settings.apiKey) {
      console.log('Auto-calling is disabled or API key is missing');
      return false;
    }

    try {
      // Format the message for the AI to read
      const message = this.formatConfirmationMessage(reservation);
      
      // Make the API call to CallFluent
      const response = await axios.post(
        `${this.settings.apiEndpoint}/calls`,
        {
          phoneNumber: reservation.phoneNumber,
          callbackNumber: this.settings.callbackNumber,
          message: message,
          reservationId: reservation.id,
          metadata: {
            reservationDate: reservation.date,
            reservationTime: reservation.time,
            partySize: reservation.partySize,
            customerName: reservation.customerName
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.settings.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('CallFluent API response:', response.data);
      return true;
    } catch (error) {
      console.error('Error triggering CallFluent call:', error);
      return false;
    }
  }

  /**
   * Format a message for the AI to read during the confirmation call
   */
  private formatConfirmationMessage(reservation: Reservation): string {
    const date = new Date(reservation.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Convert 24h time to 12h time for the message
    const timeParts = reservation.time.split(':');
    const hour = parseInt(timeParts[0]);
    const minute = timeParts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minute} ${ampm}`;

    return `Hello ${reservation.customerName}, this is a confirmation call for your reservation at ${formattedDate} at ${formattedTime} for ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}. Please press 1 to confirm this reservation, or press 2 if you need to make changes.`;
  }

  /**
   * Trigger a reminder call for an upcoming reservation
   */
  async triggerReminderCall(reservation: Reservation): Promise<boolean> {
    if (!this.settings.autoCallEnabled || !this.settings.apiKey) {
      return false;
    }

    try {
      // Format the message for the AI to read
      const message = this.formatReminderMessage(reservation);
      
      // Make the API call to CallFluent
      const response = await axios.post(
        `${this.settings.apiEndpoint}/calls`,
        {
          phoneNumber: reservation.phoneNumber,
          callbackNumber: this.settings.callbackNumber,
          message: message,
          reservationId: reservation.id,
          metadata: {
            reservationDate: reservation.date,
            reservationTime: reservation.time,
            partySize: reservation.partySize,
            customerName: reservation.customerName,
            callType: 'reminder'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.settings.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('CallFluent reminder call response:', response.data);
      return true;
    } catch (error) {
      console.error('Error triggering CallFluent reminder call:', error);
      return false;
    }
  }

  /**
   * Format a message for the AI to read during the reminder call
   */
  private formatReminderMessage(reservation: Reservation): string {
    const date = new Date(reservation.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Convert 24h time to 12h time for the message
    const timeParts = reservation.time.split(':');
    const hour = parseInt(timeParts[0]);
    const minute = timeParts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minute} ${ampm}`;

    return `Hello ${reservation.customerName}, this is a friendly reminder about your upcoming reservation tomorrow at ${formattedTime} for ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}. We look forward to seeing you. Press 1 to confirm you'll be attending, or press 2 if you need to make changes to your reservation.`;
  }
}

/**
 * Create a CallFluent service instance from settings
 */
export const createCallfluentService = (): CallfluentService | null => {
  try {
    const savedSettings = localStorage.getItem('callfluentSettings');
    if (!savedSettings) {
      return null;
    }
    
    const settings = JSON.parse(savedSettings) as CallfluentSettings;
    return new CallfluentService(settings);
  } catch (error) {
    console.error('Error creating CallFluent service:', error);
    return null;
  }
};
