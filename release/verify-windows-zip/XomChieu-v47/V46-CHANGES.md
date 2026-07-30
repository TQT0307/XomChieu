# V46 - Stable Admin and data safety

- Fixed the Admin runtime crash caused by using the native JavaScript `Map`
  constructor as the clubs navigation icon.
- Moved Admin content navigation definitions into a dedicated module and used
  the explicitly named `MapPinned` icon to prevent future global-name
  collisions.
- Added a regression test that validates unique Admin tab IDs and the clubs
  icon binding.
- Added bounded automatic retries for failed CRUD synchronization. The latest
  unsaved Admin state stays queued instead of being silently dropped after a
  temporary Firebase, Redis or network failure.
- Added cleanup for deferred browser-storage writes and retry timers when the
  application unmounts.
- Deferred optional MongoDB and Firebase Storage modules until those backends
  are actually configured and used, reducing normal Firebase/Redis serverless
  cold-start work.
- Preserved all V45 cache migration, cloud persistence, backup, responsive UI
  and search improvements.
