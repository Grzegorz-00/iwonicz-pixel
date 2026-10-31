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
- 92 nazwane miejsca z OSM oraz autorski wpis Zdrojowa 87, sześć wyróżnionych; wyszukiwanie, kategorie, opisy i odsyłacze do obiektów źródłowych.
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

## Dokładniejsze kolory dachów ze zdjęć lotniczych

[Analiza źródeł, dat, rozdzielczości i ograniczeń](docs/orthophoto-research.md). Wykorzystano oryginalny GeoTIFF RGB GUGiK/PZGiK z **19 czerwca 2024 r., 25 cm/piksel**, arkusz M-34-92-B-c-1-4. `data/ortho-observations.json` zawiera przybliżone kolory 62 obrysów budynków z tego arkusza, metodę i sumę SHA-256 materiału źródłowego. Próbki są liczone wewnątrz obrysów OSM, z pominięciem krawędzi, głębokich cieni i wartości odstających. Nie wyznaczano wysokości ani materiałów. Nie jest to pełne pokrycie miasta. Przy obiektach z próbką karta miejsca podaje datę zdjęcia i przybliżony charakter pomiaru.

Mapa nie pobiera zdjęć podczas oglądania. `appearance.js` i `data/ortho-observations.json` muszą być również dostępne na hostingu statycznym. Dokumentacyjny podgląd zdjęcia pochodzi z GUGiK/PZGiK, nie z OSM.

Opcjonalne odtworzenie analizy (niepotrzebne do uruchamiania strony): Python 3.12 i biblioteki z `scripts/requirements-orthophoto.txt`, najlepiej w osobnym środowisku wirtualnym. Pobierz [oryginalny GeoTIFF](https://opendata.geoportal.gov.pl/ortofotomapa/81421/81421_1364771_M-34-92-B-c-1-4.tif), następnie:

```sh
python3 scripts/analyze-orthophoto.py /sciezka/do/arkusza.tif \
  --source-url https://opendata.geoportal.gov.pl/ortofotomapa/81421/81421_1364771_M-34-92-B-c-1-4.tif \
  --date 2024-06-19
```

Importer tej analizy obsługuje wyłącznie zdjęcia północne GeoTIFF EPSG:2180 i nie zastępuje analizy dowolnych arkuszy. Dla kolejnego arkusza należy też zaktualizować jego godło w skrypcie. Pobieranie pełnego pliku może potrwać kilka minut; nie jest konieczne do odtworzenia bieżącej mapy.

## Gęstość grafiki i samochód przy Zdrojowej 87

Raster terenu, grafiki budynków i płótno widoku renderują się teraz w **2× większej rozdzielczości na każdej osi — 4× więcej pikseli** przy tej samej skali mapy (dodatkowo do DPR ekranu). Współrzędne geograficzne, szerokości ulic i zapisane pozycje pozostają w logicznych jednostkach. Samochody mają płynny kierunek nadwozia, cztery koła, osobne szyby, słupki, światła i zderzaki; ruch korzysta z tego samego grafu OSM.

Wyszukanie **Zdrojowa 87** lub **skurczybyk** pokazuje nieruchomego, szarego SUV-a inspirowanego Cherokee XJ z 1990 roku, z kanciastym nadwoziem, siedmioma szczelinami grilla, relingami i chmurką „skurczybyk”. Jest to autorski dodatek wskazany przez użytkownika. Adres pochodzi z OSM, obrys `way/347637101`; pozycję auta wybrano przy najbliższym dojeździe `highway=service`, poza obrysem domu. Nie jest to informacja o rzeczywistym pojeździe pod tym adresem. Auto stoi także wtedy, gdy symulacja ruchu jest uruchomiona. Wpis adresowy ma identyfikator `zdrojowa-87` i można udostępnić jego widok w URL.

Do hostingu statycznego dołącz `special-car.js`. Testy sprawdzają adres i dojazd, a w Chromium zweryfikowano rzeczywisty mnożnik powierzchni rastra 4×, chmurkę, wyszukiwanie i odtwarzanie widoku. Osobny przycisk skrótu do adresu został usunięty.

## Domy jednorodzinne

Domy oznaczone w OSM jako `house`, `detached`, `semidetached_house`, `bungalow`, `terrace` i `allotment_house` mają **dachy dwuspadowe i maksymalnie dwie kondygnacje łącznie**. Niewielkie budynki `building=yes` z numerem adresowym, bez oznaczenia usług, nazwy i informacji o większej liczbie kondygnacji są również traktowane jako domy. To heurystyka rendererera, nie zmiana danych OSM. Hotele, sanatoria i bloki zachowują dotychczasowe wysokości. Dla domów z brakującą wysokością przyjęto dwie kondygnacje, a dla bungalowów jedną.

`building-model.js` wyznacza kierunek kalenicy z obrysu budynku, dzieli dach na dwie połacie i dodaje ściany szczytowe. Obrysy, kolory pochodzące z ortofotomapy i raster o większej gęstości pozostają zachowane. Reguła dachów i limit wysokości realizują założenie wizualne użytkownika; nie są pomiarem liczby pięter ani pełną rekonstrukcją wszystkich dachów ze zdjęć. Złożone obrysy mają uproszczoną wspólną kalenicę. Moduł należy udostępnić również na hostingu statycznym.

Ponownie przeanalizowano ortofotomapę GUGiK HighResolution w okolicy Zdrojowej (bbox `21.790,49.5715,21.7955,49.5752`). Widoczne dachy skośne uzasadniają porzucenie jednolitego płaskiego modelu domów; występują także dachy wielospadowe. Data tego kadru nie była ustalana osobno. Maksymalna liczba kondygnacji jest regułą projektu, nie wnioskiem z tego zdjęcia.

## GitHub Pages

Strona: **https://grzegorz-00.github.io/iwonicz-pixel/**

Workflow `.github/workflows/pages.yml` testuje projekt, przygotowuje statyczną paczkę i wdraża ją na GitHub Pages przy każdym pushu na `main`. Można go uruchomić również ręcznie w zakładce Actions. Publikowany jest katalog `dist/` zawierający wyłącznie pliki strony i dwa zestawy JSON. Serwer deweloperski, testy, skrypty analizy i dokumentacja nie są częścią publikowanej paczki.

Lokalne przygotowanie identycznej paczki: `npm run build:pages`. Odnośniki, importy modułów i pobieranie JSON są względne, więc działają także w podkatalogu `/iwonicz-pixel/`. W Settings → Pages źródłem wdrożenia jest GitHub Actions. Wdrożenie nie wykonuje nowych zapytań do OSM ani Geoportalu — korzysta z danych zapisanych w repozytorium.
