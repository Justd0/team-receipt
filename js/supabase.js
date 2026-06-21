import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getWeekReceipts(mondayStr, fridayStr) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .gte('date', mondayStr)
    .lte('date', fridayStr)
    .order('date');
  if (error) throw error;
  return data ?? [];
}

export async function getTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function uploadReceiptImage(file, filename) {
  const { error } = await supabase.storage
    .from('receipts')
    .upload(filename, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(filename);
  return data.publicUrl;
}

export async function saveReceipt({ date, amount, imageUrl, participants }) {
  const { error } = await supabase
    .from('receipts')
    .insert({ date, amount, image_url: imageUrl, participants });
  if (error) throw error;
}

export async function updateReceipt(id, { date, amount, participants }) {
  const { error } = await supabase
    .from('receipts')
    .update({ date, amount, participants })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReceipt(id, imageUrl) {
  if (imageUrl) {
    const marker = '/receipts/';
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const path = imageUrl.slice(idx + marker.length);
      await supabase.storage.from('receipts').remove([path]);
    }
  }
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) throw error;
}
