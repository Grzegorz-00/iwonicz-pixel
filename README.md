# Iwonicz Pixel

Interaktywna mapa całego miasta Iwonicz-Zdrój w pikselowej stylistyce. Rzeczywiste granice administracyjne, drogi i ścieżki, obrysy budynków, wody oraz tereny zielone pochodzą z OpenStreetMap. Bez zewnętrznych bibliotek przeglądarkowych i bez pobierania kafelków.

## Uruchomienie

Node.js 20 lub nowszy:

```sh
npm start
```

Port 3000, opcjonalnie `PORT`. Nie potrzeba instalacji zależności ani kompilacji. Na hostingu statycznym udostępnij `index.html`, `style.css`, `app.js`, `osm-map.js`, `geography.js`, `traffic.js` oraz katalog `data/`. Do lokalnego podglądu użyj serwera HTTP, nie `file://`.

## Obszar i źródło

Mapa obejmuje **miasto Iwonicz-Zdrój**, relację [OSM 3015693](https://www.openstreetmap.org/relation/3015693), `admin_level=8`. Nie jest to cała gmina Iwonicz-Zdrój. Zestaw danych obejmuje pełny prostokąt ograniczający granicę miasta; warstwy są przycinane do granicy podczas rysowania. Obiekty przecinające granicę zachowują pełną geometrię w pliku źródłowym.

W `data/iwonicz-osm.json` zapisano 3413 obiektów pobranych z oficjalnego API OSM. Data pobrania i bbox są w metadanych. Pozostałe metadane edytorów OSM (nazwy użytkowników, UID) nie są przechowywane. Budynki i drogi są rysowane z rzeczywistych współrzędnych, z lokalnym przeliczeniem skali długości geograficznej. Drzewa są dekoracją wyłącznie wewnątrz obszarów lasów, nie inwentaryzacją pojedynczych drzew. Kolory i wysokości ścian są stylizowane. Widok jest izometryczny. To mapa poglądowa, bez wyznaczania tras.

**Dane: © OpenStreetMap contributors, licencja ODbL 1.0.** [Prawa i warunki](https://www.openstreetmap.org/copyright), [tekst licencji](https://opendatacommons.org/licenses/odbl/1-0/). Dołącz atrybucję i licencję przy dalszym udostępnianiu danych. Dane OSM mogą być niekompletne lub nieaktualne. Lokalny plik danych jest dostępny przez serwer pod `/data/iwonicz-osm.json`.

## Aktualizacja danych

Wymagane Python 3, curl oraz dostęp HTTPS do `api.openstreetmap.org`:

```sh
npm run import:osm
```

Importer pobiera pełną relację granicy miasta i jej bbox w małych fragmentach, scala obiekty według typu i identyfikatora oraz pobiera pełne geometrie multipolygonów. Korzysta ze standardowego proxy i weryfikacji TLS curl. Nie wymaga kluczy API. Błędny import nie zastępuje istniejącego zestawu danych. Cache w `/tmp/iwonicz-osm-cache` jest ważny dobę; `node scripts/import-osm.mjs --cache /tmp/inny-cache` pozwala wykonać świeży import. Żądania są sekwencyjne z ograniczonymi ponowieniami. Zestaw jest migawką z czasu pobierania, nie transakcyjnym eksportem całej bazy w jednej sekundzie. Odbiorcy strony nie odpytują API OSM.

Overpass okazał się niedostępny podczas pracy; aplikacja i importer korzystają z oficjalnego API OSM, nie z Overpass.

## Obsługa

- Przeciąganie myszą i dotykiem, powiększanie kółkiem, gestem lub przyciskami, do 1200%.
- 92 nazwane miejsca z OSM, sześć wyróżnionych; wyszukiwanie, kategorie, opisy i odsyłacze do obiektów źródłowych.
- W widoku całego miasta wyróżnione miejsca; kolejne oznaczenia pojawiają się po powiększeniu. Wyszukiwanie i filtry pokazują wyniki także w ogólnym widoku.
- Podziałka, granica miasta, nazwy ulic przy większym przybliżeniu, przełącznik etykiet i reset do całego miasta.
- Widok i wybrany obiekt w adresie `#iso@x,y,zoom,id`. Wcześniejsze adresy `#osm@…` są przeliczane; dawne schematyczne współrzędne `#@…` są ignorowane.
- `/` — wyszukiwanie; strzałki na mapie — przesuwanie; `+`/`-` — skala; Escape — zamknięcie opisu.

## Weryfikacja

`npm test` sprawdza serwer HTTP, typy zasobów, ochronę plików repozytorium, importer, geograficzną projekcję, łączenie granic, otwory w wielokątach oraz kompletność rzeczywistego zestawu. Interakcje, odtworzenie adresu, linki OSM i układ telefonu sprawdzono również w Chromium.

## Widok izometryczny i ruch

Stylistyka inspirowana klasycznymi grami transportowymi: izometria 2:1, oryginalne pikselowe samochody i postacie, drzewa, ściany i okna budynków oraz interfejs z przyciskami retro. Nie wykorzystano grafik Transport Tycoon Deluxe.

`traffic.js` tworzy lokalny graf połączonych odcinków z zapisanych geometrii OSM. 100 samochodów i 160 pieszych porusza się po tym grafie, wybierając kolejne odcinki na skrzyżowaniach. Auta omijają ścieżki piesze, drogi prywatne i zakazy ruchu oraz uwzględniają kierunek `oneway`. Piesi korzystają z dróg, ścieżek i alejek z dopuszczonym ruchem pieszym. Na drogach mają wizualne odsunięcie ku krawędzi. Jest to dekoracyjna animacja, nie pomiar ruchu ani pełna symulacja przepisów drogowych. Nie odwzorowuje sygnalizacji, skrzyżowań wielopoziomowych, rzeczywistych chodników ani celów podróży.

Panel nad mapą: **Pauza / Wznów**, prędkości **1× / 2× / 4×**, **Centrum**. Reset przy powiększeniu pokazuje cały obszar miasta. Początkowy widok jest przybliżony do centrum, żeby widać było ruch; na telefonie ma większą skalę. Ruch startuje wstrzymany przy systemowym `prefers-reduced-motion`, a animacja zatrzymuje się po ukryciu karty przeglądarki. Budynki i pojazdy są sortowane według głębokości widoku; ściany mogą zasłaniać obiekty za nimi. Grafiki statyczne są renderowane raz, animacja działa do 30 klatek/s.

Aktualne adresy mają format `#iso@x,y,zoom,id`; wcześniejsze adresy `#osm@…` są przeliczane na izometrię. Podziałka odnosi się do poziomej osi widoku (w izometrii skala pionowa jest inna). Do hostingu statycznego dołącz również `traffic.js`.

Testy obejmują graf ruchu, ograniczenia dostępu, ciągłość przechodzenia między odcinkami i projekcję izometryczną. W Chromium sprawdzono zmianę klatek animacji, brak ruchu po pauzie, prędkości, odtwarzanie adresów i ograniczenie animacji.
