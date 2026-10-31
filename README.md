# Iwonicz Pixel

Autorska, interaktywna mapa ilustracyjna Iwonicza-Zdroju. Czysty JavaScript i Canvas, bez zewnętrznych zależności i usług. Ilustracja jest schematyczna — nie służy do nawigacji.

## Uruchomienie

Wymagany Node.js 20 lub nowszy. W katalogu repozytorium:

```sh
npm start
```

Domyślny port: 3000, opcjonalnie zmienna `PORT`. Nie jest potrzebne `npm install` ani kompilacja. Pliki `index.html`, `style.css` i `app.js` można również opublikować na dowolnym hostingu statycznym.

## Funkcje

- Przeciąganie mapy myszą lub dotykiem, powiększanie kółkiem, gestem i przyciskami.
- Sześć miejsc z opisami, wyszukiwanie i filtrowanie według kategorii.
- Udostępnianie widoku i wybranego miejsca przez fragment adresu.
- Obsługa klawiatury: `/` przenosi do wyszukiwania; na mapie strzałki przesuwają, `+` i `-` zmieniają skalę. Escape zamyka opis.
- Układ dostosowany do telefonu i komputera, przełączanie nazw, reset widoku.

Grafika generowana lokalnie, bez pobierania kafelków i bez kopiowania materiałów ze strony inspiracyjnej. Położenia i wizerunki budynków są umowne. Dane miejsc znajdują się na początku `app.js`.

## Weryfikacja

`npm test` sprawdza odpowiedzi HTTP, typy zasobów oraz blokowanie dostępu do plików repozytorium. Interakcje mapy, wyszukiwanie, filtry, odtwarzanie adresu i układ mobilny sprawdzono również w Chromium.
