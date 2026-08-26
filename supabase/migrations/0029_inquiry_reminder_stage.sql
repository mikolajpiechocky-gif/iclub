-- 0029 Przypomnienia o nieodpisanych leadach: znacznik ostatniego wysłanego etapu (0/2/4/24 h).
alter table public.inquiries add column if not exists reminder_stage int not null default 0;
comment on column public.inquiries.reminder_stage is 'Ostatni wyslany etap przypomnienia leada (0/2/4/24 h). Reset przy nowej wiadomosci klienta.';
