# Instrukcja użytkownika - rola Administrator

Rola **Administrator** ma pełen dostęp do aplikacji: wszystko, co opisano w `USER-MANUAL.md` (zarządzanie kontami, wyniki, statystyki, dziennik zdarzeń), plus dodatkowe uprawnienia i pełny dostęp do zakładki **Ustawienia**. Ten dokument opisuje różnice i funkcje dostępne wyłącznie dla Administratora - podstawy (filtry, wyszukiwanie, statystyki, dziennik zdarzeń) opisano w `USER-MANUAL.md` i nie są tu powtarzane.

## 1. Dodatkowe uprawnienia w zarządzaniu kontami (`/dashboard`)

W przeciwieństwie do Pracownika, jako Administrator możesz:

- **zarządzać kontami o roli Administrator** (aktywować/dezaktywować także innych administratorów, nie tylko Studentów/Pracowników),
- **zmieniać rolę** dowolnego konta (Student / Pracownik / Administrator) - selektor roli w wierszu/karcie konta,
- **trwale usunąć konto** przyciskiem "Usuń" - operacja jest nieodwracalna (dane konta znikają bezpowrotnie), ale ten sam adres e-mail można później ponownie zarejestrować jako nowe konto,
- **aktywować z pominięciem linku e-mail konto studenta, dla którego nie znaleziono jeszcze wyniku** - Pracownik ma tu przycisk zablokowany, bo bez wyniku nie da się w inny sposób zweryfikować tożsamości.

Nie możesz zmienić roli, statusu ani usunąć **własnego konta**.

W dzienniku zdarzeń (`/logs`) jako jedyny widzisz kolumny **IP** i **Przeglądarka** przy każdym wpisie (dane osobowe) oraz przycisk "Wróć do ustawień".

## 2. Ustawienia (`/settings`)

Strona dostępna wyłącznie dla roli Administrator, złożona z kart - każda odpowiada jednej grupie ustawień.

### Adresy e-mail do powiadomień

Lista adresów (jeden na linię lub oddzielonych przecinkami), na które trafiają powiadomienia administracyjne: o nowych kontach oczekujących na akceptację, zmianach statusów, zablokowanych kontach, próbach rejestracji cudzymi danymi, brakujących wynikach itd. **Jeśli lista jest pusta, żadne z tych powiadomień nie zostanie wysłane** (mimo że zdarzenie i tak trafia do dziennika zdarzeń).

### Okres udostępnienia wyników

Data i godzina (czas warszawski) początku i końca okresu, w którym studenci mogą sprawdzać swoje wyniki. Przed datą początkową panel studenta pokazuje zapowiedź terminu; w trakcie okresu udostępnia formularz weryfikacji numerem wniosku.

**Wygaszanie po dacie końcowej** (przełącznik w tej samej karcie, domyślnie **włączony**):
- **Włączony** - po dacie końcowej rejestracja nowych kont jest automatycznie wyłączana (skróty do rejestracji znikają ze strony głównej, nagłówka i strony logowania; `/register` pokazuje komunikat "Możliwość założenia konta została wyłączona."), a studenci po zalogowaniu widzą w panelu komunikat "Możliwość sprawdzenia wyniku egzaminu została wyłączona." Logowanie samo w sobie zawsze działa.
- **Wyłączony** - rejestracja i dostęp do wyników pozostają możliwe zawsze, niezależnie od upływu daty końcowej.

### Limity weryfikacji numeru wniosku

Dwie niezależne liczby (domyślnie po 3): maksymalna liczba błędnych prób podania numeru wniosku i maksymalna liczba poprawnych wyświetleń wyniku, zanim konto studenta zostanie automatycznie zablokowane.

### Import wyników egzaminów

Wgranie pliku `.xlsx` z nagłówkami: Praktyka, Teoria, Końcowa, Ocena ustna, Ocena pisemna, zawód, Imię, Nazwisko, Pesel, Nr wniosku. **Import zastępuje całą dotychczasową tabelę wyników** - przed wczytaniem nowego pliku wszystkie poprzednie wyniki zostają usunięte (wymagane potwierdzenie w oknie dialogowym). Po imporcie system automatycznie próbuje dopasować wyniki do istniejących kont studenckich.

### Dopasowywanie kont do wyników

Przycisk "Uruchom dopasowywanie" ręcznie powtarza próbę powiązania kont studenckich bez przypisanego wyniku z rekordami w tabeli wyników (po imieniu, nazwisku i wskazanych cyfrach PESEL). Dzieje się to automatycznie przy aktywacji konta i po imporcie wyników - ten przycisk służy do ręcznego przeliczenia w innych sytuacjach (np. po ręcznej korekcie danych w bazie).

### Automatyczne wylogowanie

Czas bezczynności (w sekundach, domyślnie 900 = 15 minut), po którym użytkownik zostaje wylogowany. Przełącznik **"Tylko studenci"** ogranicza automatyczne wylogowanie wyłącznie do kont ze statusem studenta - Pracownicy i Administratorzy nigdy nie są w ten sposób wylogowywani.

### Kopia zapasowa bazy danych

- **"Pobierz kopię zapasową"** - eksportuje wszystkie tabele do pliku `.json`.
- **"Przywróć"** - wczytuje wcześniej pobrany plik `.json` i **całkowicie zastępuje bieżącą zawartość bazy danych** (konta, wyniki, ustawienia). Operacja jest nieodwracalna i wymaga potwierdzenia w oknie dialogowym - rób to świadomie, najlepiej po uprzednim pobraniu świeżej kopii bieżącego stanu.

### Przełączniki

- **Przerwa konserwacyjna** - po włączeniu konta o roli Student nie mogą się zalogować, a na stronie logowania i stronie głównej ukrywane są skróty do rejestracji (rejestracja jest wtedy całkowicie zablokowana, niezależnie od okresu udostępniania wyników). Pracownicy i Administratorzy mogą logować się bez przeszkód.
- **Pomijanie weryfikacji e-mail** - po włączeniu nowo zarejestrowane konta pomijają link aktywacyjny i trafiają od razu do stanu "Oczekuje na akceptację" (powiadomienie do adminów wysyłane jest wtedy od razu po rejestracji, a nie po potwierdzeniu e-mail).

### Dziennik zdarzeń

- Link "Zobacz dziennik zdarzeń" (skrót do `/logs`).
- **Liczba dni przechowywania wpisów** (domyślnie 90) - starsze wpisy są automatycznie czyszczone przy każdej wizycie na stronie dziennika (adres IP i przeglądarka to dane osobowe, więc dziennik nie powinien rosnąć bez końca).
- **Liczba rekordów na stronie** (domyślnie 50) - rozmiar stronicowania w widoku dziennika.

### Limity wysyłki AWS SES / Limity wysyłki MailerSend

Aplikacja wysyła pocztę przez SMTP - dostawcę (aktualnie MailerSend, wcześniej AWS SES) konfiguruje się w zmiennych środowiskowych (`SMTP_HOST/PORT/USER/PASSWORD/FROM`), nie w tym panelu. Te dwie karty pozwalają jedynie ustawić **własne, wewnętrzne limity wysyłki**, żeby nie przekroczyć realnych limitów u dostawcy:

- **AWS SES** - dzienny limit maili (domyślnie 180) i maksymalne tempo wysyłki w mailach/s (domyślnie 1). Warto porównać z aktualnymi wartościami w konsoli AWS SES (Account dashboard → Sending limits) i ustawić tu z niewielkim zapasem.
- **MailerSend** - miesięczny limit maili (domyślnie 500, odpowiada planowi Free). Ten dostawca nie narzuca osobnego limitu tempa/s. Plan Hobby daje 5000 maili/mies. w stałej opłacie, z dopłatą 1,5 USD za każde kolejne 1000 maili powyżej limitu.

**Oba limity są pilnowane jednocześnie**, niezależnie od tego, który dostawca jest aktualnie realnie skonfigurowany w zmiennych środowiskowych - jeśli którykolwiek zostanie osiągnięty, wysyłka danego maila jest pomijana (zdarzenie zostaje mimo to zapisane w dzienniku zdarzeń jako "Wysyłka e-maila pominięta (limit)"), a treść samego zdarzenia (np. link aktywacyjny) nie ginie - jest zapisana w bazie niezależnie od tego, czy mail dotarł.

Jeśli SMTP w ogóle nie jest skonfigurowany w zmiennych środowiskowych, żaden mail fizycznie nie wychodzi - to normalne w środowisku deweloperskim.

## 3. Kiedy aplikacja wysyła e-maile

Powiadomienia (do studenta i/lub na listę adresów administracyjnych) wysyłane są automatycznie przy: rejestracji (link weryfikacyjny), potwierdzeniu e-maila, aktywacji/dezaktywacji konta, zablokowaniu konta (błędny numer wniosku lub limit wyświetleń wyniku), poprawie danych profilu przez studenta, próbach rejestracji/edycji danymi już przypisanymi do cudzego wyniku oraz zalogowaniu studenta w oknie udostępniania wyników bez dopasowanego wyniku (nie częściej niż raz na dobę na konto). Każde z tych zdarzeń jest też niezależnie zapisywane w dzienniku zdarzeń, nawet jeśli wysyłka maila zostanie pominięta z powodu limitu.

## 4. Zapomniane hasło

Aplikacja nie ma funkcji resetu hasła. Jedyny sposób odzyskania dostępu to usunięcie konta (przycisk "Usuń" na liście kont) i ponowna rejestracja przez użytkownika na ten sam adres e-mail.
