-- 0035: rozróżnienie leadów ze strony — konfigurator (WEBSITE_FORM) vs prosty formularz kontaktowy.
alter type public.inquiry_source add value if not exists 'WEBSITE_CONTACT';
