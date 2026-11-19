-- 0011: Nepali text for the bilingual site. The app falls back to English
-- wherever a *_ne column is empty, so this is safe to run at any time.

begin;

alter table indicators add column if not exists description_ne text;
alter table sources    add column if not exists name_ne text;

update indicators set description_ne = 'चलनचल्तीमा रहेको मुद्रा तथा वाणिज्य बैंक र वित्तीय संस्थाहरूमा रहेका चल्ती, मुद्दती र अन्य निक्षेपको योग।'
  where code = 'broad_money_m2' and description_ne is null;
update indicators set description_ne = 'सहरी तथा ग्रामीण उपभोग्य वस्तुको टोकरीमा आधारित उपभोक्ता मूल्य सूचकाङ्कको वार्षिक बिन्दुगत मुद्रास्फीति दर।'
  where code = 'cpi_inflation_yoy' and description_ne is null;
update indicators set description_ne = 'नेपाल राष्ट्र बैंक तथा अन्य बैंकिङ संस्थासँग रहेको कुल विदेशी मुद्रा सम्पत्ति (अमेरिकी डलरमा)।'
  where code = 'foreign_exchange_reserves_usd' and description_ne is null;

update indicators set name_ne = 'उपभोक्ता मूल्य सूचकाङ्क (CPI) मुद्रास्फीति'
  where code = 'cpi_inflation_yoy' and (name_ne is null or name_ne = 'उपभोक्ता मुद्रास्फीति');

update sources set name_ne = 'नेपाल राष्ट्र बैंक'       where short_name = 'NRB' and name_ne is null;
update sources set name_ne = 'राष्ट्रिय तथ्याङ्क कार्यालय' where short_name = 'NSO' and name_ne is null;
update sources set name_ne = 'अर्थ मन्त्रालय'           where short_name = 'MoF' and name_ne is null;

commit;
