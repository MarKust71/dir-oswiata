# Instrukcja użytkownika - rola Pracownik

Rola **Pracownik** (w kodzie: `USER`) ma dostęp do zarządzania kontami studentów i pracowników, przeglądu wyników egzaminów, statystyk oraz dziennika zdarzeń. **Nie ma dostępu do Ustawień aplikacji.**

Konto z rolą Pracownik zakłada wyłącznie administrator, ręcznie zmieniając rolę istniejącego konta (rejestracja publiczna zawsze tworzy konta studenckie).

## 1. Nawigacja

Po zalogowaniu w górnym menu masz dostęp do zakładek: **Użytkownicy**, **Wyniki**, **Statystyki**, **Log**. Zakładka **Ustawienia** jest widoczna tylko dla Administratora.

Na urządzeniach mobilnych nazwa aplikacji i wersja są u góry po lewej, a Twoja rola/e-mail i pozostałe linki chowają się pod przyciskiem hamburgera po prawej.

Sesja jest automatycznie kończona po czasie bezczynności ustalonym przez administratora (domyślnie 15 minut) - chyba że administrator ograniczył to tylko do kont studenckich.

## 2. Zarządzanie kontami (`/dashboard`, zakładka "Użytkownicy")

Lista pokazuje wszystkie konta (łącznie z kontami roli Administrator - są widoczne, ale poza Twoimi uprawnieniami do zarządzania).

### Filtrowanie i wyszukiwanie

- **Rola** - domyślnie widoczne są tylko konta Studentów; można dodatkowo zaznaczyć Pracownika i Administratora.
- **Status** - Oczekuje na e-mail / Oczekuje na akceptację / Aktywne / Wyłączone (domyślnie wszystkie).
- **Wynik** - Pozytywny / Negatywny / Brak (domyślnie wszystkie).
- Na urządzeniach mobilnych filtry są zwinięte pod przyciskiem "Filtry".
- Pole wyszukiwania szuka po e-mailu, imieniu, nazwisku i telefonie.
- Przełącznik **"Ukryj w.w."** chowa studentów, którzy już wyświetlili swój wynik.
- Przełącznik **"Odśwież automatycznie"** odpytuje serwer o świeże dane co 60 sekund.
- Kliknięcie nagłówka "E-mail" lub "Imię i nazwisko" sortuje listę (trzeci klik wraca do domyślnej kolejności alfabetycznej po e-mailu).

### Kolumny i akcje

- **E-mail / Imię i nazwisko** - pod nazwiskiem widać telefon (jeśli podany) i zamaskowany numer PESEL (odsłonięte tylko te cyfry, które student wskazał przy rejestracji).
- **Wynik** - dla studentów: etykieta POZYTYWNY/NEGATYWNY, po kliknięciu otwiera pełne szczegóły wyniku (oceny ustna/pisemna/teoretyczna/praktyczna/końcowa); "BRAK", jeśli konto nie jest jeszcze powiązane z żadnym wynikiem.
- **W.w.** - ikona informująca, czy student już wyświetlił swój wynik.
- **Rola** - tylko do odczytu (zmianę roli wykonuje wyłącznie Administrator).
- **Status** - status "Oczekuje na e-mail" jest klikalny: pozwala ręcznie wysłać ponownie link aktywacyjny na konto.
- **Rejestracja** - data rejestracji jest linkiem, który otwiera w nowej karcie Dziennik zdarzeń przefiltrowany do wpisów dotyczących tego konta.
- **Akcje** - patrz niżej.

### Co możesz zrobić z kontem

| Status konta | Dostępna akcja |
| --- | --- |
| Oczekuje na e-mail | "Aktywuj" - pomija link weryfikacyjny i od razu aktywuje konto |
| Oczekuje na akceptację | "Zatwierdź" |
| Aktywne | "Dezaktywuj" |
| Wyłączone | "Aktywuj" (przywraca dostęp, przyznaje nowy komplet prób weryfikacji) |

Ograniczenia Twojej roli:

- **Nie możesz** zarządzać (aktywować/dezaktywować) kontami o roli **Administrator**.
- **Nie możesz** zmienić roli ani trwale usunąć żadnego konta - te opcje widzi tylko Administrator.
- Jeśli aktywujesz z pominięciem e-maila konto **studenta bez jeszcze dopasowanego wyniku**, przycisk będzie nieaktywny - taką aktywację może wykonać wyłącznie Administrator (bo nie da się wtedy zweryfikować tożsamości inaczej niż linkiem e-mail).
- Reaktywacja konta, które **już wyświetliło swój wynik** lub zostało **zablokowane po 3 błędnych numerach wniosku**, wymaga dodatkowego potwierdzenia w oknie dialogowym (przyznajesz w ten sposób nowy komplet prób).
- Nie możesz zmienić statusu własnego konta.

## 3. Wyniki egzaminów (`/results`)

Podgląd wszystkich zaimportowanych wyników (niezależnie od tego, czy są już powiązane z kontem). Wyszukiwarka działa po imieniu i nazwisku albo po wklejonej masce numeru PESEL (np. `• • • • • • 1 • • 3 0`). Kliknięcie wyniku pokazuje pełne szczegóły ocen.

## 4. Statystyki (`/statistics`)

Zestawienie liczbowe: liczba wyeksportowanych z Merlina wyników, liczba założonych kont studenckich, liczba kont połączonych z wynikiem, liczba kont, które wyświetliły wynik - wraz z procentami. Przycisk "Odśwież" pobiera aktualne dane bez przeładowania strony.

## 5. Dziennik zdarzeń (`/logs`, zakładka "Log")

Trwały zapis zdarzeń aplikacji (rejestracje, logowania, zmiany statusów, wysyłki e-maili itd.), niezależny od tego, czy dany e-mail faktycznie dotarł.

- Filtr **typu zdarzenia** (rozwijana lista).
- Pole **wyszukiwania w treści wiadomości** - filtruje po stronie serwera, więc obejmuje cały zbiór, a nie tylko bieżącą stronę wyników.
- Paginacja: Pierwsza / Poprzednia / Następna / Ostatnia strona.
- Przełącznik "Odśwież automatycznie" (co 60 sekund).
- **Kolumny IP i Przeglądarka są ukryte dla Twojej roli** - to dane osobowe widoczne wyłącznie dla Administratora.
- Nie zobaczysz przycisku "Wróć do ustawień" (nie masz dostępu do Ustawień).

## 6. Czego nie możesz zrobić (podsumowanie)

- wejść do Ustawień aplikacji,
- zarządzać kontami o roli Administrator,
- zmieniać ról użytkowników,
- trwale usuwać kont,
- aktywować z pominięciem e-maila konta studenta bez dopasowanego wyniku,
- zobaczyć adresu IP i przeglądarki w dzienniku zdarzeń.

Wszystkie te operacje wykonuje wyłącznie Administrator - zob. `ADMIN-MANUAL.md`.
