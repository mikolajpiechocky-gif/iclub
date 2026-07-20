"use server";
// Server Action: podpowiadanie adresów (Places Autocomplete, §37). Klucz Map
// pozostaje po stronie serwera. Bez klucza zwraca pustą listę.
import { autocompleteAddress, type AddressSuggestion } from "@/lib/integrations/google-maps";

export async function suggestAddressesAction(input: string): Promise<AddressSuggestion[]> {
  return autocompleteAddress(input);
}
