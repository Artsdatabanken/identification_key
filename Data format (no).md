# Artsdatabankens nøkkelløsning
###### Konsepter og dataformatet

## Kort om nøkkelen
Det finnes flere typer digitale bestemmelsesnøkler. I “pathway”-typen får brukeren ett og ett spørsmål i en fast rekkefølge, helt til man er fremme ved resultatet. Det andre ytterpunktet, “random access”-varianten, lar brukeren filtrere i en liste over mulige utfall ved selektere egenskaper, slik at man kan sitte igjen med kun ett resultat til slutt.

Artsdatabankens nøkkelløsning er den tredje, hybride typen. Ut fra hva som er kjent om arten får brukeren et eller flere spørsmål. Dette gjør det mulig å representere alle eksisterende nøkler, om de er rent dikotome, matrise-basert, eller noe i mellom. Det gir også gode muligheter for å lett utvide nøkkelen senere med mer informasjon, flere arter og/eller flere egenskaper.

Nøkkelens innhold lagres i et regneark. Det er mange muligheter for å representere diverse parametre og forhold, men nesten ingen er påbudt. Denne bruksanvisningen behandler alle muligheter, men dens lengde og kompleksitet er ingen grunn til bekymring: de allerfleste nøkler vil ikke benytte alle felt. Hvis du har en eksisterende nøkkel, eller en start på et konsept, så hjelper vi gjerne med å få den inn i vårt format.


## Datamodell og konsepter
I tillegg til noe informasjon om selve nøkkelen så er det taksa (arter, eller høyere/lavere taksonomiske nivå), egenskaper, samt relasjonene mellom arter og egenskaper som utgjør nøkkelen. En oversikt over hvilke typer informasjon nøkkelen kan inneholde (kun parametre med en  :exclamation: er påkrevd).

### Informasjon om nøkkelen
:exclamation:**Navn**: Nøkkelens tittel, for eksempel “Hjortedyr”.   
**Geografisk område**: Hvilket område nøkkelen er gyldig for, for eksempel “Svalbard”.   
**Ingress**: Kort tekst om nøkkelen (html er tillatt).   
**Beskrivelse**: ID-nummer til en beskrivelse av nøkkelen i Artsdatabankens system.   
**Språk**: nøkkelens språk, for eksempel “No-nb”.   

### Taksa
**Navn**: Navnet for taksonet. Feltet er kun til midlertidlig visning mens navnet hentes fra Artsdatankens system. Er imidlertid praktisk for å holde oversikten i regnearket.   
:exclamation:**Takson**: ID-nummer til taksonet i Artsdatabankens systemer. Artsdatabanken kan konvertere en liste med vitenskapelige navn til riktige ID-er.   
**Media-element**: ID-nummeret eller url til et bilde som illustrerer taksonet   
**Beskrivelse**: ID-nummer til en beskrivelse av taksonet i Artsdatabankens system   
**Subset**: det er mulig å definere subsett til taksa: ett eller flere undernivå av et takson som har forskjellige egenskaper, og som man ønsker at brukeren skal nøkle frem til. For eksempel hann/hunn av samme art (man vil da få spørsmål for å skille mellom de to, også når arten allerede er fastslått).   
**Morf**: det er mulig å definere morfer av taksa: ett eller flere undernivå av et takson som har forskjellige egenskaper, men som man ikke ønsker at brukeren skal nøkle frem til. For eksempel vanlige/melanistiske individer av samme art (man vil da ikke få spørsmål for å skille mellom de to, det er nok at arten er fastslått).   
**Sortering**: en sorteringsindeks for visning av arter. Når det er unike tall for alle taksa så styrer denne sorteringen visningen 100%. Taksa uten sortering eller som deler samme sorteringsindeks blir sortert (avløpende) på antall registrerte funn i Artskart.   
**Oppfølging**: en lenke til en oppfølgingsnøkkel, for å (arts)bestemme nærmere.

### Egenskaper
:exclamation:**Spørsmål**: egenskapen, for eksempel “Hva er vingefargen?” eller bare “Vingefarge”.   
:exclamation:**Svar**: et mulig svaralternativ som gører til et spørsmål, for eksempel “Gul”.   
**Spørsmålets type**: om spørsmålet kan ha flere gyldige svar samtidig for et individ, for eksempel når “svart” og “rød” begge skal kunne krysses av for å angi at individer er røde med svarte flekker.   
**Spørsmålets forutsetninger**: en logisk regel som definerer når spørsmålet kan presenteres. For eksempel for å bare vise et spørsmål om vingefarge når det er kjent at arten både er et insekt og at den har vinger.   
**Spørsmålets beskrivelse**:  ID-nummer til en beskrivelse av egenskapen (spørsmålet) i Artsdatabankens system.   
**Spørsmålets sortering**: en sorteringsindeks for visning av spørsmål. Når det er unike tall for alle spørsmål så styrer denne sorteringen rekkefølgen 100%. Spørsmål uten sortering eller som deler samme sorteringsindeks (for eksempel for å skille mellom felt-lupe-lab kriterier) blir sortert (avløpende) på snittet i standardavvik fra det “perfekte” spørmålet (som gir mest mulig utslag).   
**Svarets media-element**: ID-nummeret eller url til et bilde som illustrerer svaralternativet.   

### Takson-egenskap-koblinger
Egenskaper (svar) og taksa kan ha flere typer relasjoner. Disse angis med tall:

| Verdi | Tolkning |
| --- | --- |
| 1 | individer i taksonet har alltid denne egenskapen |
| 0 | individer i taksonet har aldri denne egenskapen |
| 0.xx | individer i taksonet har denne egenskapen i xx % av tilfellene |
|  | det er irrelevant/uspesifisert om individer i taksonet har denne egenskapen |

## Dataformatet
Nøkkelens innhold lagres i et regneark. Fet tekst i eksemplene nedenfor er nøkkelord, som må skrives slik for at systemet kan tolke disse parametrene. De som ikke brukes kan utelates.

En minimal nøkkel, med kun påkrevde felt  kan se slik ut:

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Key name** | Eksempel | **Taxon** | 4515 | 837700 |
| **Character** | **State**   |       | | | 
| Har fjær/pels | Fjær | | 1 | 0 |
| | Pels | | 0 | 1 |
| Farge | Hvit | | 1 | 0.5 |
| | Brun | | 0 | 0.5 |

Dette gir en fungerende nøkkel som skiller mellom snøugle (med takson-id 4515) og fjellrev (837700). Det er nok å oppgi om dyret har fjær eller pels, men for eksempelet er også fargen med. Ikke alle fjellrever er hvite, så hvit og brun får hver sin verdi mellom 0 og 1.

### Informasjon om nøkkelen
Øverst til venstre listes informasjonen om nøkkelen. I sin mest fullstendige form ser feltene slik ut:

|  | |
| --- | --- |
| **Key name** | Eksempel |
| **Geographic range** | Norges fastland |
| **Language** | No-nb |
| **Key intro** | Dette er en eksempelnøkkel som beskriver noen arter som man finner på fastlandet i Norge. | 
| **Key description** | 180944 | 

**Key name** er navnet til nøkkelen.   
**Geographic range** er området som nøkkelen er laget til.   
**Language** er språket som brukes i nøkkelen.   
**Key intro** er en kort beskrivelse av nøkkelen.   
**Key description** er et id-nummer til en beskrivelse av nøkkelen i Artsdatabankens system.   

### Egenskaper
Parametre knyttet til egenskaper, dvs spørsmål og svar (characters og states) får hver sin kolonne, under nøkkelinformasjonen og den siste raden med en parameter angående taksa.  I sin mest fullstendige form ser feltene slik ut:

Character | State | Multistate character | Character requirement | Description | State id | State media | Sort
--- | --- | --- | --- | --- | --- | --- | --- 
Antall ben | 6 |  | | 63445 | 6ben | 2342 | 1 
           | 2 | | |        | 2ben | 6774 | 
Vinger | Har vinger | | | 6345533 | vinger | 3466 | 1
Vingefarge | Rød | TRUE | {vinger} && {6ben} | 3343435 |  | http://www.blablabla.no | 2
 | Svart | | | |  | 23552 | 
 | Blå   | | | | | | 

**Character** og **state** er spørsmålet og dens svaralternativer. Det er tillatt med alt fra 1 til mange svaralternativer. Vingespørsmålet har kun ett alternativ i eksempelet, bruker kan da gi positivt eller negativt svar. Det er også mulig å ha to alternativ: har vinger versus har ikke vinger, som brukeren da velger mellom.   
**Multistate character** angir om flere svaralternativer kan være sann samtidig, for eksempel hvis vingene er røde med svarte prikker. Hvis ingenting er oppgitt er det antatt å ikke være tilfellet: individer har enten 6 eller 2 ben.   
**Character requirement** gir muligheten til å oppgi en logisk premiss som må oppfylles før spørsmålet stilles. Svar kan refereres til via **State id**, mellom {}, som i eksempelet. Det brukes javascript notering; “!” er “ikke”, “&&” er “og”, “||” er eller, og parentes “()” kan brukes. Slik kan kompliserte regler defineres: (A || B) && ((!C && !D) || (E && !F)): A eller B, samt ikke C og ikke D, og/eller E og ikke F.   
**Description** er et id-nummer til en beskrivelse av spørsmålet og dens alternativer i Artsdatabankens system.   
**State media** er et id-nummer som refererer til en bildefil av egenskapen (svaret) i Artsdatabankens system, eller en url som refererer til et bilde et annet sted på nett.   
**Sort** er sorteringsindeksen. Det sorteres først på den, og deretter på snittet i standardavvik fra det “perfekte” spørmålet (som gir mest mulig utslag).   

### Taksa
Parametre knyttet til nøkkelens mulige utfall (taksa) får hver sin rad, til høyre for nøkkelinformasjonen og den siste kolonnen med en parameter angående egenskaper .  I sin mest fullstendige form ser feltene slik ut:

 | | | | |
 --- | --- | --- | --- | --- | ---
**Name** | Fjellrev hann | Fjellrev hunn | Fjellhumle vanlig | Fjellhumle melanistisk | Torsk
**Taxon** | 837700 | 837700 | 634534 | 634534 | 466437
**Subset** | ♂ | ♀ | | | 
**Media** | 4534 | 7445 | 23423 | 12245 | 7456 
**Description** | 346773 | 346773 | 345744 | 345744 | 967343
**Followup** | | | | | /Files/13512

**Name** er en parameter som brukes mens takson-navnet hentes fra artsnavnebasen. Den gjør regnearket også mer oversiktlig.   
**Taxon** er et id-nummer til et takson i Artsdatabankens system.   
**Subset** definerer et undernivå av taksonet ved å ha to kolonner for samme taksonet med hver sin subset. Disse individer har unike egenskaper, og man ønsker at brukeren skal kunne nøkle frem til de. I dette eksempelet hann/hunn av fjellreven (man vil da få spørsmål for å skille mellom de to, også når det allerede er fastslått at det er fjellrev).   
***Morfer*** definerer et undernivå av taksonet ved å ha to kolonner for samme takson, men da uten å definere subset. Disse individer har unike egenskaper, men man ønsker ikke at brukeren skal kunne nøkle frem til de. I dette eksempelet vanlig/melanistisk morf av fjellhumla (man vil da ikke få spørsmål for å skille mellom de to, det er nok at det er fastslått at det er fjellhumle).   
**Media** er et id-nummer som refererer til en bildefil av taksonet i Artsdatabankens system, eller en url som refererer til et bilde et annet sted på nett.   
**Description** er et id-nummer til en beskrivelse av taksonet i Artsdatabankens system.   
**Followup** er en peker mot en oppfølgingsnøkkel, som brukeren kan velge å gå videre til for å (arts)bestemme nærmere.

### Flere eksempler
Et reelt eksempel med en ikke for kompleks nøkkel:

| | | | | | | |
| --- |  --- | --- | --- | --- | --- | --- |
| **Key name** | Eksempel | | | **Name** | Snøugle | Fjellrev |
| **Key intro** | Testnøkkel intro tekst | | | **Taxon** | 4515 | 837700 |
| **Key description** | 664564 | | | **Media** | 67345 | 57564 |
| | | | | **Description** | 774566 | 632346 |
| **Character** | **State** | **Description** | **State media** | | | |
| Har fjær/pels | Fjær | 456353 | 65655 | | 1 | 0 | 
|  | Pels | | 87684 | | 0 | 1 |
| Farge | Hvit | 745626 | 73455 | | 1 | 0.5 |
| | Brun | | 78435 | | 0 | 0.25 |
| | Grå | | 65454 | | 0 | 0.25 |
