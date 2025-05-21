import { NextApiRequest, NextApiResponse } from 'next';
import { createContact, updateContact, deleteContact } from '@/lib/hubspotCMD';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      try {
        const contact = await createContact(req.body);
        res.status(201).json(contact);
      } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ message: 'Error creating contact' });
      }
      break;
    case 'PUT':
      try {
        const { contactId, contactData } = req.body;
        const contact = await updateContact(contactId, contactData);
        res.status(200).json(contact);
      } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ message: 'Error updating contact' });
      }
      break;
    case 'DELETE':
      try {
        const { contactId } = req.body;
        await deleteContact(contactId);
        res.status(204).end();
      } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ message: 'Error deleting contact' });
      }
      break;
    default:
      res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
