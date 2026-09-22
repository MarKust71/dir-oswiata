# Instrukcja użytkownika - rola Student

System DIR Oświata służy do sprawdzenia wyniku Twojego egzaminu czeladniczego/mistrzowskiego. Aby zobaczyć wynik, musisz najpierw założyć konto, potwierdzić adres e-mail i poczekać na akceptację przez pracownika Izby.

## 1. Rejestracja konta

Rejestracja jest dostępna pod adresem `/register` (przycisk "Zarejestruj się" na stronie głównej i w nagłówku).

Formularz wymaga podania:

- **adresu e-mail** - będzie Twoim loginem,
- **hasła** - co najmniej 8 znaków, w tym co najmniej jedna litera i jedna cyfra, oraz jego powtórzenia,
- **imienia i nazwiska** - muszą być zgodne z protokołem egzaminu,
- **3 losowo wskazanych cyfr Twojego numeru PESEL** - system pyta tylko o wybrane pozycje (np. cyfry 2, 6 i 10), nigdy o cały numer; układ pytanych pozycji jest losowany przy każdej próbie,
- **numeru telefonu** - opcjonalnie, ułatwia szybszy kontakt w razie wątpliwości.

Jeśli podane dane (imię, nazwisko, wskazane cyfry PESEL) już wcześniej zostały użyte do założenia innego konta powiązanego z tym samym wynikiem egzaminu, rejestracja zostanie zablokowana ze względów bezpieczeństwa, a właściciel istniejącego konta oraz Izba otrzymają o tym powiadomienie.

> **Rejestracja może być czasowo niedostępna.** Jeśli trwa przerwa konserwacyjna albo minął już termin udostępniania wyników (a administrator włączył odpowiedni mechanizm w Ustawieniach), przyciski/skróty do rejestracji znikają, a strona `/register` pokazuje komunikat o niedostępności zakładania kont.

## 2. Potwierdzenie adresu e-mail

Po rejestracji otrzymasz e-mail z linkiem aktywacyjnym (ważnym 24 godziny). Po jego otwarciu kliknij przycisk "Potwierdź adres e-mail" - link **nie weryfikuje się automatycznie** samym otwarciem strony.

Po potwierdzeniu konto przechodzi do stanu **"Oczekuje na akceptację"** - o aktywacji poinformujemy Cię osobnym e-mailem.

Jeśli spróbujesz się zalogować, zanim potwierdzisz e-mail, zobaczysz komunikat z przyciskiem "Wyślij ponownie link weryfikacyjny" (można go użyć nie częściej niż raz na minutę).

## 3. Logowanie

Logowanie (`/login`) działa zawsze - nie jest wyłączane po terminie udostępniania wyników. W zależności od stanu konta możesz zobaczyć:

| Sytuacja | Komunikat |
| --- | --- |
| Błędny e-mail lub hasło | "Nieprawidłowy e-mail lub hasło." |
| E-mail niepotwierdzony | prośba o potwierdzenie + link do ponownej wysyłki |
| Konto czeka na akceptację | "Konto oczekuje na akceptację administratora." |
| Konto dezaktywowane/zablokowane | "To konto zostało dezaktywowane. Skontaktuj się z administratorem." |

Jeśli trwa **przerwa konserwacyjna**, logowanie na konto studenckie jest tymczasowo zablokowane odrębnym komunikatem.

### Automatyczne wylogowanie

Ze względów bezpieczeństwa aplikacja może automatycznie wylogować Cię po określonym czasie braku aktywności (domyślnie 15 minut, dokładny czas ustala administrator). Po powrocie na stronę logowania zobaczysz informację o przyczynie i będziesz mógł zalogować się ponownie.

## 4. Panel konta (`/panel`)

Po zalogowaniu trafiasz do panelu z podstawowymi danymi konta: e-mail, imię i nazwisko, telefon, wskazane cyfry numeru PESEL.

### Sprawdzenie wyniku egzaminu

Wyniki są dostępne wyłącznie w wyznaczonym przez Izbę okresie. W zależności od sytuacji panel pokaże:

- **przed rozpoczęciem okresu** - datę i godzinę, od kiedy wyniki będą dostępne,
- **w trakcie okresu, wynik jeszcze nie dopasowany** - informację, że wyniki nie są jeszcze dostępne (możliwe powody: różnice w danych osobowych względem protokołu egzaminu lub błędnie podane cyfry PESEL) - Izba zostaje o tym automatycznie powiadomiona,
- **w trakcie okresu, wynik znaleziony** - formularz do wpisania **numeru wniosku**,
- **po zamknięciu okresu** (jeśli administrator włączył odpowiedni mechanizm) - komunikat "Możliwość sprawdzenia wyniku egzaminu została wyłączona."

Aby zobaczyć wynik, wpisz swój numer wniosku (np. `123/2026`) w polu weryfikacji. Po poprawnym podaniu zobaczysz wynik teoretyczny, praktyczny i końcowy (POZYTYWNY/NEGATYWNY).

**Limity bezpieczeństwa:**
- **3 błędne próby** podania numeru wniosku (limit ustala administrator) blokują konto - potrzebna będzie ponowna aktywacja przez pracownika Izby.
- **3 poprawne wyświetlenia** wyniku (limit ustala administrator) również blokują konto - to zabezpieczenie przed udostępnianiem dostępu osobom trzecim.

Każde zablokowanie pokazuje dane kontaktowe do Izby na dole komunikatu.

### Poprawa danych konta

Jeśli Twoje dane w systemie różnią się od protokołu egzaminu (i wynik jeszcze nie został znaleziony/dopasowany), możesz je poprawić ikoną ołówka przy nagłówku panelu. Formularz pozwala zmienić imię, nazwisko, telefon i ponownie wpisać wskazane (na nowo wylosowane) cyfry numeru PESEL.

> **Uwaga:** po zapisaniu poprawionych danych zostaniesz automatycznie wylogowany, a konto wraca do stanu "Oczekuje na akceptację" - wymaga ponownej weryfikacji i aktywacji przez administratora lub pracownika.

Jeśli poprawione dane pasują już do wyniku przypisanego do innego, istniejącego konta, zmiana zostaje odrzucona, a Twoje konto zablokowane ze względów bezpieczeństwa (Izba i właściciel tamtego konta otrzymują powiadomienie).

Przycisk edycji znika, gdy Twoje konto ma już przypisany wynik - w takim wypadku dalsze zmiany danych wykonuje wyłącznie Izba.

## 5. Zapomniane hasło

System nie ma obecnie funkcji samodzielnego resetu hasła. Jeśli zapomnisz hasła, skontaktuj się z Izbą - jedynym rozwiązaniem jest usunięcie konta przez administratora i ponowna rejestracja na ten sam adres e-mail.

## 6. Kontakt

Dane kontaktowe do Dolnośląskiej Izby Rzemieślniczej we Wrocławiu widoczne są w stopce każdej strony aplikacji (adres e-mail i numer telefonu).
