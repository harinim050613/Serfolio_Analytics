import { chromium } from 'playwright';
import * as path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewportSize({ width: 1200, height: 800 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to http://localhost:9000...');
  await page.goto('http://localhost:9000');
  await page.waitForTimeout(1000);

  // Check initial DOM layout
  const cardsCount = await page.locator('#services-grid .bento-card').count();
  console.log(`Number of bento cards found: ${cardsCount}`);

  const containerBounds = await page.locator('#slide-3').boundingBox();
  console.log('Slide 3 Container Bounds:', containerBounds);

  const stickyWrapperBounds = await page.locator('.services-sticky-wrapper').boundingBox();
  console.log('Sticky Wrapper Bounds:', stickyWrapperBounds);

  const gridBounds = await page.locator('#services-grid').boundingBox();
  console.log('Services Grid Bounds:', gridBounds);

  // Print initial card states
  console.log('--- Initial Card States (Scroll = 0) ---');
  for (let i = 0; i < cardsCount; i++) {
    const transform = await page.locator('#services-grid .bento-card').nth(i).evaluate(el => el.style.transform);
    const zIndex = await page.locator('#services-grid .bento-card').nth(i).evaluate(el => el.style.zIndex);
    const rect = await page.locator('#services-grid .bento-card').nth(i).boundingBox();
    console.log(`Card ${i}: transform="${transform}", zIndex="${zIndex}", bounds=`, rect);
  }

  // Scroll to slide-3
  console.log('Scrolling to Slide 3 container top...');
  await page.evaluate(() => {
    const el = document.getElementById('slide-3');
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  await page.waitForTimeout(500);

  // Perform scroll increments and print state
  const scrollSteps = 5;
  const containerHeight = containerBounds.height;
  const scrollRange = containerHeight - 800; // viewport height is 800
  console.log(`Container Height: ${containerHeight}px, Scrollable Range: ${scrollRange}px`);

  for (let step = 0; step <= scrollSteps; step++) {
    const progress = step / scrollSteps;
    const scrollTop = containerBounds.y + (progress * scrollRange);
    
    console.log(`\n--- Step ${step}/${scrollSteps} (Progress: ${(progress * 100).toFixed(0)}%, ScrollTop: ${scrollTop.toFixed(0)}) ---`);
    
    await page.evaluate((scrollVal) => {
      window.scrollTo(0, scrollVal);
    }, scrollTop);
    
    await page.waitForTimeout(500);

    // Take a screenshot
    const screenshotPath = `screenshot_step_${step}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Print card states
    for (let i = 0; i < cardsCount; i++) {
      const transform = await page.locator('#services-grid .bento-card').nth(i).evaluate(el => el.style.transform);
      const zIndex = await page.locator('#services-grid .bento-card').nth(i).evaluate(el => el.style.zIndex);
      const rect = await page.locator('#services-grid .bento-card').nth(i).boundingBox();
      console.log(`Card ${i}: transform="${transform}", zIndex="${zIndex}", bounds=`, rect);
    }
  }

  await browser.close();
  console.log('Done verification!');
})();
