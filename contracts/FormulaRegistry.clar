(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-HASH u101)
(define-constant ERR-INVALID-TITLE u102)
(define-constant ERR-INVALID-DESCRIPTION u103)
(define-constant ERR-INVALID-TIMESTAMP u104)
(define-constant ERR-FORMULA-ALREADY-EXISTS u105)
(define-constant ERR-FORMULA-NOT-FOUND u106)
(define-constant ERR-INVALID-ROYALTY-RATE u107)
(define-constant ERR-INVALID-CONTRIBUTOR-SHARE u108)
(define-constant ERR-TOO-MANY-CONTRIBUTORS u109)
(define-constant ERR-INVALID-UPDATE-PARAM u110)
(define-constant ERR-UPDATE-NOT-ALLOWED u111)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u112)
(define-constant ERR-INVALID-MIN-ROYALTY u113)
(define-constant ERR-INVALID-MAX-ROYALTY u114)
(define-constant ERR-INVALID-FORMULA-TYPE u115)
(define-constant ERR-INVALID-STATUS u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-INVALID-VERSION u119)
(define-constant ERR-MAX-FORMULAS-EXCEEDED u120)

(define-data-var next-formula-id uint u0)
(define-data-var max-formulas uint u10000)
(define-data-var registration-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map formulas
  uint
  {
    hash: (buff 32),
    title: (string-utf8 100),
    description: (string-utf8 500),
    timestamp: uint,
    creator: principal,
    royalty-rate: uint,
    formula-type: (string-utf8 50),
    status: bool,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    version: uint,
    min-royalty: uint,
    max-royalty: uint
  }
)

(define-map formulas-by-hash
  (buff 32)
  uint
)

(define-map formula-updates
  uint
  {
    update-title: (string-utf8 100),
    update-description: (string-utf8 500),
    update-royalty-rate: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map contributors
  uint
  (list 10 { contributor: principal, share: uint })
)

(define-read-only (get-formula (id uint))
  (map-get? formulas id)
)

(define-read-only (get-formula-updates (id uint))
  (map-get? formula-updates id)
)

(define-read-only (get-contributors (id uint))
  (map-get? contributors id)
)

(define-read-only (is-formula-registered (hash (buff 32)))
  (is-some (map-get? formulas-by-hash hash))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-TITLE))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (<= (len desc) u500)
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-royalty-rate (rate uint))
  (if (and (>= rate u0) (<= rate u100))
      (ok true)
      (err ERR-INVALID-ROYALTY-RATE))
)

(define-private (validate-formula-type (ftype (string-utf8 50)))
  (if (or (is-eq ftype "synthesis") (is-eq ftype "compound") (is-eq ftype "biotech"))
      (ok true)
      (err ERR-INVALID-FORMULA-TYPE))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (<= (len loc) u100)
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-version (ver uint))
  (if (> ver u0)
      (ok true)
      (err ERR-INVALID-VERSION))
)

(define-private (validate-min-royalty (min uint))
  (if (>= min u0)
      (ok true)
      (err ERR-INVALID-MIN-ROYALTY))
)

(define-private (validate-max-royalty (max uint))
  (if (>= max u0)
      (ok true)
      (err ERR-INVALID-MAX-ROYALTY))
)

(define-private (validate-contributors (contribs (list 10 { contributor: principal, share: uint })))
  (let ((total-share (fold + (map get-share contribs) u0)))
    (if (and (<= (len contribs) u10) (is-eq total-share u100))
        (ok true)
        (err ERR-INVALID-CONTRIBUTOR-SHARE)))
)

(define-private (get-share (contrib { contributor: principal, share: uint }))
  (get share contrib)
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-formulas (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-FORMULAS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-formulas new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-formula
  (hash (buff 32))
  (title (string-utf8 100))
  (description (string-utf8 500))
  (royalty-rate uint)
  (formula-type (string-utf8 50))
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (version uint)
  (min-royalty uint)
  (max-royalty uint)
  (contribs (list 10 { contributor: principal, share: uint }))
)
  (let (
        (next-id (var-get next-formula-id))
        (current-max (var-get max-formulas))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-FORMULAS-EXCEEDED))
    (try! (validate-hash hash))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-royalty-rate royalty-rate))
    (try! (validate-formula-type formula-type))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-version version))
    (try! (validate-min-royalty min-royalty))
    (try! (validate-max-royalty max-royalty))
    (try! (validate-contributors contribs))
    (asserts! (is-none (map-get? formulas-by-hash hash)) (err ERR-FORMULA-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (map-set formulas next-id
      {
        hash: hash,
        title: title,
        description: description,
        timestamp: block-height,
        creator: tx-sender,
        royalty-rate: royalty-rate,
        formula-type: formula-type,
        status: true,
        location: location,
        currency: currency,
        version: version,
        min-royalty: min-royalty,
        max-royalty: max-royalty
      }
    )
    (map-set formulas-by-hash hash next-id)
    (map-set contributors next-id contribs)
    (var-set next-formula-id (+ next-id u1))
    (print { event: "formula-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-formula
  (formula-id uint)
  (update-title (string-utf8 100))
  (update-description (string-utf8 500))
  (update-royalty-rate uint)
)
  (let ((formula (map-get? formulas formula-id)))
    (match formula
      f
        (begin
          (asserts! (is-eq (get creator f) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-title update-title))
          (try! (validate-description update-description))
          (try! (validate-royalty-rate update-royalty-rate))
          (map-set formulas formula-id
            {
              hash: (get hash f),
              title: update-title,
              description: update-description,
              timestamp: block-height,
              creator: (get creator f),
              royalty-rate: update-royalty-rate,
              formula-type: (get formula-type f),
              status: (get status f),
              location: (get location f),
              currency: (get currency f),
              version: (get version f),
              min-royalty: (get min-royalty f),
              max-royalty: (get max-royalty f)
            }
          )
          (map-set formula-updates formula-id
            {
              update-title: update-title,
              update-description: update-description,
              update-royalty-rate: update-royalty-rate,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "formula-updated", id: formula-id })
          (ok true)
        )
      (err ERR-FORMULA-NOT-FOUND)
    )
  )
)

(define-public (get-formula-count)
  (ok (var-get next-formula-id))
)

(define-public (check-formula-existence (hash (buff 32)))
  (ok (is-formula-registered hash))
)