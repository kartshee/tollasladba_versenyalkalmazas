const DIRECT_MESSAGE_MAP = {
  'Csak lezárt versenynél kezelhető az eredményjavítás feloldása.': 'Az eredményjavítás feloldása csak lezárt versenynél használható.',
  'A lezárt verseny eredményei jelenleg zároltak. Előbb oldd fel az eredményjavítást.': 'A lezárt verseny eredményei most zároltak. Előbb oldd fel az eredményjavítást.',
  'A lezárt verseny jelenleg zárolt, ezért a meccs nem módosítható.': 'A lezárt verseny jelenleg zárolt, ezért a meccs nem módosítható.',
  'Lezárt versenynél a meccs státusza már nem módosítható.': 'Lezárt versenynél a meccs státusza már nem módosítható.',
  'Érvénytelenített meccs státusza nem módosítható.': 'Érvénytelenített meccs státusza nem módosítható.',
  'Befejezett meccs státusza nem módosítható.': 'Befejezett meccs státusza nem módosítható.',
  'Csak beütemezett meccs indítható el: szükséges pálya és időpont.': 'Csak beütemezett meccs indítható el: szükséges pálya és időpont.',
  'Az egyik játékos már egy másik futó meccsben szerepel.': 'Az egyik játékos már egy másik futó meccsben szerepel.',
  'A meccshez tartozó verseny nem található.': 'A meccshez tartozó verseny nem található.',
  'Tournament not found': 'A verseny nem található.',
  'Tournament finished': 'A verseny már lezárt.',
  'Tournament is not editable unless status=draft': 'A verseny csak tervezet állapotban szerkeszthető.',
  'Only draft tournament can be started': 'Csak tervezet állapotú verseny indítható el.',
  'Only running tournament can be finished': 'Csak futó verseny zárható le.',
  'Category not found': 'A kategória nem található.',
  'Group not found': 'A csoport nem található.',
  'Player not found': 'A játékos nem található.',
  'Match not found': 'A meccs nem található.',
  'Entry not found': 'A nevezés nem található.',
  'Payment group not found': 'A fizetési csoport nem található.',
  'Payment group not found in this tournament': 'A fizetési csoport nem található ebben a versenyben.',
  'User not found': 'A felhasználó nem található.',
  'Missing or invalid Authorization header': 'Hiányzó vagy hibás azonosítási fejléc.',
  'User not found for token': 'A munkamenethez tartozó felhasználó nem található.',
  'Invalid or expired token': 'Érvénytelen vagy lejárt munkamenet. Jelentkezz be újra.',
  'name is required': 'A név megadása kötelező.',
  'valid email is required': 'Érvényes e-mail-cím megadása kötelező.',
  'password must be at least 6 characters': 'A jelszónak legalább 6 karakter hosszúnak kell lennie.',
  'Email already registered': 'Ez az e-mail-cím már regisztrálva van.',
  'email and password are required': 'Az e-mail-cím és a jelszó megadása kötelező.',
  'Invalid credentials': 'Hibás e-mail-cím vagy jelszó.',
  'Password updated successfully': 'A jelszó sikeresen frissítve lett.',
  'Could not update password': 'A jelszó frissítése nem sikerült.',
  'currentPassword and newPassword are required': 'A jelenlegi és az új jelszó megadása kötelező.',
  'Cannot modify a voided match': 'Érvénytelenített meccs nem módosítható.',
  'Cannot assign umpire to a voided match': 'Érvénytelenített meccshez nem rendelhető játékvezető.',
  'umpireName must be a string': 'A játékvezető neve csak szöveg lehet.',
  'Content-Type must be application/json': 'A kérés Content-Type értékének application/json-nak kell lennie.',
  'Missing status in request body': 'Hiányzik a státusz a kérés törzséből.',
  'status must be pending or running': 'A státusz csak várakozó vagy futó lehet.',
  'Cannot change status of a voided match': 'Érvénytelenített meccs státusza nem módosítható.',
  'Cannot change status of a finished match': 'Befejezett meccs státusza nem módosítható.',
  'Only pending can be started': 'Csak várakozó meccs indítható el.',
  'Cannot revert to pending when result exists': 'Rögzített eredmény mellett a meccs nem tehető vissza várakozó állapotba.',
  'type must be wo | ff | ret': 'Az eredménytípus csak wo, ff vagy ret lehet.',
  'winnerSide must be player1 | player2': 'A győztes oldala csak player1 vagy player2 lehet.',
  'Invalid startAt': 'Érvénytelen kezdési időpont.',
  'No playoff matches generated yet': 'Még nem jött létre rájátszás meccs.',
  'Playoff final already exists': 'A döntő már létezik.',
  'No playoff round can be advanced right now': 'Jelenleg nincs továbbvihető rájátszás kör.',
  'Not enough players': 'Nincs elegendő játékos.',
  'Unsupported playoffSize': 'Nem támogatott rájátszás-méret.',
  'Category format is not playoff': 'A kategória formátuma nem rájátszás.',
  'Category is not draw_locked yet': 'A kategória sorsolása még nincs lezárva.',
  'Grace not ended yet': 'A türelmi idő még nem járt le.',
  'Players must differ': 'A két játékosnak különböznie kell.',
  'Players must belong to this category (MVP)': 'A játékosoknak ebbe a kategóriába kell tartozniuk.',
  'Cannot update players after draw is locked': 'A játékosok már nem módosíthatók a sorsolás lezárása után.',
  'A kért végpont nem található.': 'A kért végpont nem található.',
  'Váratlan szerverhiba történt.': 'Váratlan szerverhiba történt.'
};

function humanizeFieldName(fieldName) {
  const labels = {
    tournamentId: 'versenyazonosító',
    categoryId: 'kategóriaazonosító',
    groupId: 'csoportazonosító',
    matchId: 'meccsazonosító',
    playerId: 'játékosazonosító',
    paymentGroupId: 'fizetési csoport azonosítója',
    payerName: 'fizető neve',
    feeAmount: 'nevezési díj',
    paid: 'befizetett állapot',
    text: 'szöveg',
    status: 'státusz',
    startAt: 'kezdési időpont',
    currentPassword: 'jelenlegi jelszó',
    newPassword: 'új jelszó'
  };
  return labels[fieldName] ?? fieldName;
}

/**
 * A backendből érkező technikai üzeneteket egységes, magyar felhasználói hibaszöveggé alakítja.
 */
export function translateApiErrorMessage(rawMessage, status) {
  const message = String(rawMessage ?? '').trim();
  if (!message) {
    if (status === 401) return 'A munkamenet lejárt vagy érvénytelen. Jelentkezz be újra.';
    if (status === 403) return 'Ehhez a művelethez nincs jogosultságod.';
    if (status === 404) return 'A kért elem nem található.';
    if (status >= 500) return 'Szerverhiba történt. Kérlek, próbáld újra később.';
    return 'Ismeretlen hiba történt.';
  }

  if (DIRECT_MESSAGE_MAP[message]) return DIRECT_MESSAGE_MAP[message];

  const invalidIdMatch = message.match(/^Invalid\s+([A-Za-z0-9_]+)$/);
  if (invalidIdMatch) return `Érvénytelen ${humanizeFieldName(invalidIdMatch[1])}.`;

  const requiredFieldMatch = message.match(/^([A-Za-z0-9_.]+) is required$/);
  if (requiredFieldMatch) return `A(z) ${humanizeFieldName(requiredFieldMatch[1])} megadása kötelező.`;

  if (message === 'paid must be a boolean') return 'A befizetett állapot csak igaz vagy hamis érték lehet.';
  if (message === 'player1Id and player2Id required') return 'Mindkét játékos megadása kötelező.';
  if (message === 'One or more entryIds are invalid for this tournament') return 'A megadott nevezések között van érvénytelen ehhez a versenyhez.';
  if (message === 'No valid lines found') return 'A megadott szövegben nem található érvényes sor.';
  if (message === 'Player count must exactly match playoffSize for playoff-only categories') return 'Csak rájátszás kategóriánál a játékosok számának pontosan meg kell egyeznie a rájátszás méretével.';

  if (/^courtsCount must be an integer between/.test(message)) return 'A pályák számának 1 és 50 közötti egész számnak kell lennie.';
  if (/^matchMinutes must be between/.test(message)) return 'A becsült meccsidő 1 és 240 perc közé kell essen.';
  if (/^playerRestMinutes must be between/.test(message)) return 'A játékos pihenőideje 0 és 240 perc közé kell essen.';
  if (/^courtTurnoverMinutes must be between/.test(message)) return 'A pályaforgási idő 0 és 120 perc közé kell essen.';
  if (/^fairnessGap must be an integer between/.test(message)) return 'A fairness gap értékének 0 és 5 közötti egész számnak kell lennie.';
  if (/^feeAmount must be between/.test(message)) return 'A nevezési díjnak 0 és 1 000 000 közé kell esnie.';
  if (/^Odd player count with partial round robin/.test(message)) return 'Páratlan csoportlétszámnál a csonka körmérkőzéshez páros meccsszám szükséges játékosonként.';
  if (/^Odd group size with partial RR/.test(message)) return 'Páratlan csoportlétszámnál a csonka körmérkőzéshez páros meccsszám szükséges játékosonként.';
  if (/^Need at least 2 players in group$/.test(message)) return 'Egy csoportban legalább 2 játékos szükséges.';
  if (/^Group matches already generated for this group$/.test(message)) return 'Ehhez a csoporthoz a meccsek már legenerálásra kerültek.';
  if (/^sets must be an array$/.test(message)) return 'A szetteket tömbként kell megadni.';
  if (/^Set points must be numbers$/.test(message)) return 'A szettpontok csak számok lehetnek.';
  if (/^Invalid set score$/.test(message)) return 'Érvénytelen szetteredmény.';
  if (/^Too many sets provided/.test(message)) return 'Túl sok szett lett megadva a meccs lezárásához.';
  if (/^config\./.test(message)) return message.replace(/^config\./, 'A beállítás ').replace(/must be/g, 'értéke legyen').replace(/required/g, 'megadása kötelező');
  if (/^A\(z\) \d+\. pályán már fut egy másik meccs\.$/.test(message)) return message;

  return message;
}


// Dinamikus hibaüzenet: adott pályán már fut másik meccs.
