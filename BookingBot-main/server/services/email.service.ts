import nodemailer from 'nodemailer';
import { Reservation } from '../../shared/schema';

/**
 * Configuración para el servicio de email
 */
const EMAIL_FROM = '"Reservas Casa Tamariu" <luisglez.pruebas@gmail.com>';
const ADMIN_EMAIL = 'luisglez.pruebas@gmail.com'; 
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

// Configuración del transporte de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'luisglez.pruebas@gmail.com',
    pass: EMAIL_PASSWORD
  }
});

/**
 * Formatea una fecha ISO para mostrar en email (DD/MM/YYYY)
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

/**
 * Calcula las noches entre dos fechas
 */
const calculateNights = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Servicio de email para enviar notificaciones relacionadas con reservas
 */
export class EmailService {
  /**
   * Envía un email al administrador cuando se crea una nueva reserva
   * o cuando se modifica una existente
   */
  static async sendNewReservationNotificationToAdmin(reservation: Reservation, username: string): Promise<void> {
    try {
      const startDateFormatted = formatDate(reservation.startDate.toString());
      const endDateFormatted = formatDate(reservation.endDate.toString());
      const nights = calculateNights(reservation.startDate.toString(), reservation.endDate.toString());
      
      // Ajusta el tema según el estado de la reserva
      const isModified = reservation.status === 'modified';
      const subject = isModified 
        ? `Solicitud de modificación de reserva de ${username}`
        : `Nueva solicitud de reserva de ${username}`;
      
      const title = isModified
        ? `Solicitud de modificación de reserva`
        : `Nueva solicitud de reserva`;
        
      const intro = isModified
        ? `${username} ha solicitado una modificación en su reserva con los siguientes detalles:`
        : `Se ha recibido una nueva solicitud de reserva con los siguientes detalles:`;
      
      const mailOptions = {
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: subject,
        html: `
          <h1>${title}</h1>
          <p>${intro}</p>
          
          <ul>
            <li><strong>Usuario:</strong> ${username}</li>
            <li><strong>Fecha de entrada:</strong> ${startDateFormatted}</li>
            <li><strong>Fecha de salida:</strong> ${endDateFormatted}</li>
            <li><strong>Duración:</strong> ${nights} noche${nights !== 1 ? 's' : ''}</li>
            <li><strong>Número de huéspedes:</strong> ${reservation.numberOfGuests}</li>
            <li><strong>Notas adicionales:</strong> ${reservation.notes || 'Ninguna'}</li>
          </ul>
          
          <p>Por favor, accede a la <a href="${process.env.APP_URL || 'http://localhost:5000'}/admin">plataforma de administración</a> para gestionar esta solicitud.</p>
          
          <p>Gracias,<br>Sistema de Reservas</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de notificación enviado al administrador');
    } catch (error) {
      console.error('Error al enviar email al administrador:', error);
      throw new Error('No se pudo enviar la notificación al administrador');
    }
  }
  
  /**
   * Envía un email de confirmación al usuario cuando crea una reserva
   */
  static async sendReservationConfirmationToUser(reservation: Reservation, username: string, userEmail: string): Promise<void> {
    try {
      const startDateFormatted = formatDate(reservation.startDate.toString());
      const endDateFormatted = formatDate(reservation.endDate.toString());
      const nights = calculateNights(reservation.startDate.toString(), reservation.endDate.toString());
      
      const mailOptions = {
        from: EMAIL_FROM,
        to: userEmail,
        subject: 'Confirmación de solicitud de reserva',
        html: `
          <h1>Tu solicitud de reserva ha sido recibida</h1>
          <p>Hola ${username},</p>
          
          <p>Hemos recibido tu solicitud de reserva con los siguientes detalles:</p>
          
          <ul>
            <li><strong>Fecha de entrada:</strong> ${startDateFormatted}</li>
            <li><strong>Fecha de salida:</strong> ${endDateFormatted}</li>
            <li><strong>Duración:</strong> ${nights} noche${nights !== 1 ? 's' : ''}</li>
            <li><strong>Número de huéspedes:</strong> ${reservation.numberOfGuests}</li>
            <li><strong>Notas adicionales:</strong> ${reservation.notes || 'Ninguna'}</li>
          </ul>
          
          <p>Tu reserva está pendiente de aprobación. Te notificaremos cuando sea aprobada o rechazada.</p>
          
          <p>Gracias por tu reserva,<br>Sistema de Reservas</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de confirmación enviado al usuario');
    } catch (error) {
      console.error('Error al enviar email al usuario:', error);
      throw new Error('No se pudo enviar la confirmación al usuario');
    }
  }
  
  /**
   * Envía un email al usuario cuando el administrador cambia el estado de la reserva
   * o cuando se realizan modificaciones/cancelaciones
   */
  static async sendReservationStatusUpdateToUser(
    reservation: Reservation, 
    username: string, 
    userEmail: string,
    adminMessage: string = ""
  ): Promise<void> {
    try {
      const startDateFormatted = formatDate(reservation.startDate.toString());
      const endDateFormatted = formatDate(reservation.endDate.toString());
      const nights = calculateNights(reservation.startDate.toString(), reservation.endDate.toString());
      
      let statusText = 'actualizada';
      let statusMessage = '';
      
      switch (reservation.status) {
        case 'approved':
          statusText = 'aprobada';
          statusMessage = '';  // El mensaje para aprobaciones ahora está en el template especial
          break;
        case 'rejected':
          statusText = 'rechazada';
          statusMessage = 'Ha sido rechazada. Por favor, intenta reservar en otras fechas o contacta con el administrador para más información.';
          break;
        case 'modified':
          statusText = 'modificada';
          statusMessage = 'Tu solicitud de modificación ha sido procesada.';
          break; 
        case 'cancelled':
          statusText = 'cancelada';
          statusMessage = 'Tu reserva ha sido cancelada según tu solicitud.';
          break;
        default:
          statusText = 'actualizada';
          statusMessage = 'El estado de tu reserva ha sido actualizado.';
      }
      
      // Contenido HTML específico para reservas aprobadas
      let htmlContent = '';
      
      if (reservation.status === 'approved') {
        htmlContent = `
          <p>Hola ${username},</p>
          
          <p>Nos alegra informarte que tu reserva ha sido aprobada 🎉</p>
          <p>Aquí tienes los detalles:</p>
          
          <p>🗓 Fecha de entrada: ${startDateFormatted}</p>
          <p>🗓 Fecha de salida: ${endDateFormatted}</p>
          <p>⏳ Duración: ${nights} noche${nights !== 1 ? 's' : ''}</p>
          <p>👥 Número de huéspedes: ${reservation.numberOfGuests}</p>
          <p>📌 Estado: APROBADA</p>
          
          <p>🙌 Recordamos las normas de uso de la casa:</p>
          <ul>
            <li>🏡 La casa es de Maria Teresa, nuestra madre y abuela. Por favor, trátala con el cariño y el respeto que merece.</li>
            <li>📆 Si no vas a usar tu reserva, te pedimos que la modifiques o canceles lo antes posible para que otros puedan aprovecharla.</li>
            <li>🧹 Es importante dejar la casa recogida y limpia al salir. ¡Así todos la disfrutamos mejor!</li>
            <li>✨ (Opcional) Si quieres que la casa esté preparada a tu llegada, puedes contactar con la persona de limpieza. Este servicio corre por cuenta de quien hace la reserva.</li>
            <li>🚨 (Obligatorio) Al dejar la casa, es necesario contactar con una limpiadora externa para que quede en condiciones. El coste lo asume la persona que reservó.</li>
            <li>📞 Nombre y teléfono de la persona de limpieza: Por determinar</li>
          </ul>
          
          <p>Esperamos que disfrutes mucho de tu estancia 💛</p>
          <p>¡Gracias por ayudarnos a cuidar este espacio tan especial para la familia!</p>
          
          ${adminMessage ? `<p><strong>Mensaje del administrador:</strong> ${adminMessage}</p>` : ''}
          
          <p>Un saludo,<br>Sistema de Reservas 🗓️</p>
        `;
      } else {
        // HTML para otros estados (rechazado, modificado, cancelado, etc.)
        htmlContent = `
          <h1>Actualización de estado de tu reserva</h1>
          <p>Hola ${username},</p>
          
          <p>El estado de tu reserva ha cambiado.</p>
          
          <ul>
            <li><strong>Fecha de entrada:</strong> ${startDateFormatted}</li>
            <li><strong>Fecha de salida:</strong> ${endDateFormatted}</li>
            <li><strong>Duración:</strong> ${nights} noche${nights !== 1 ? 's' : ''}</li>
            <li><strong>Número de huéspedes:</strong> ${reservation.numberOfGuests}</li>
            <li><strong>Estado:</strong> <strong>${statusText.toUpperCase()}</strong></li>
          </ul>
          
          <p>${statusMessage}</p>
          
          ${adminMessage ? `<p><strong>Mensaje del administrador:</strong> ${adminMessage}</p>` : ''}
          
          <p>Gracias,<br>Sistema de Reservas</p>
        `;
      }
      
      const mailOptions = {
        from: EMAIL_FROM,
        to: userEmail,
        subject: `Tu reserva ha sido ${statusText}`,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`Email de actualización de estado (${statusText}) enviado al usuario`);
    } catch (error) {
      console.error('Error al enviar email de actualización al usuario:', error);
      throw new Error('No se pudo enviar la notificación de actualización al usuario');
    }
  }
  
  /**
   * Método de prueba para verificar la configuración del email
   */
  static async sendTestEmail(to: string): Promise<void> {
    try {
      const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject: 'Prueba de sistema de notificaciones',
        html: `
          <h1>Prueba de email</h1>
          <p>Este es un correo de prueba para verificar que el sistema de notificaciones funciona correctamente.</p>
          <p>Fecha y hora: ${new Date().toLocaleString()}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de prueba enviado correctamente');
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      throw new Error('No se pudo enviar el email de prueba');
    }
  }
}