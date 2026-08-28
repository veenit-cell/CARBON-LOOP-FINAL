# CarbonLoop Hackathon Demo

## Launch

```powershell
cd D:\CARBONLOOP
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Judge presentation

1. On `/`, select **Start Your Mission**.
2. On `/demo`, point out the visible **Hackathon Demo**, **Synthetic Data**, **Simulated Evidence**, and **Mock Reward** labels.
3. Select **Walk to Campus** and show the simulated mission result with separately reported Eco XP, Green Points, and avoided CO2e.
4. Open **Rewards** and select **Redeem mock reward**; it has no payment, delivery, or cash value.
5. Return to **Missions** and use **Shuttle check-in** once to demonstrate replay protection.
6. Open `/dashboard` and use **Refresh** to show privacy-safe synthetic aggregates. No individual movement or location records appear.
7. Return to `/demo` and select **Reset Demo**. It calls the explicit `SIMULATED_DEMO_ONLY` process-local reset endpoint and refetches the player and dashboard data. Android device verification remains NEEDS_VERIFICATION.

All content is Hackathon Demo, Synthetic Data, Simulated Evidence, or Mock Reward. No real campus, payment, user, factor, or impact claim is represented. The reset endpoint is demo-only and production persistence is not implemented.