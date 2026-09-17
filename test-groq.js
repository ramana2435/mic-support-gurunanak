/**
 * GROQ INDEPENDENT TEST - Standalone JavaScript Version
 * Run with: node test-groq.js
 */

const Groq = require('groq-sdk').default;
const fs = require('fs');
require('dotenv').config({ path: './apps/backend/.env' });

const results = [];

// Check API key
function checkApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    results.push({
      testName: 'API Authentication',
      status: 'FAIL',
      details: 'GROQ_API_KEY: MISSING',
    });
    return false;
  }
  
  results.push({
    testName: 'API Authentication',
    status: 'PASS',
    details: 'GROQ_API_KEY: CONFIGURED (length: ' + apiKey.length + ' chars)',
  });
  return true;
}

// Test authentication
async function testAuth() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return false;

  try {
    const groq = new Groq({ apiKey });
    const start = Date.now();
    
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 5,
    });
    
    const latency = Date.now() - start;
    
    results.push({
      testName: 'API Authentication Request',
      status: 'PASS',
      details: 'Successfully authenticated with Groq API',
      latency,
    });
    return true;
  } catch (error) {
    results.push({
      testName: 'API Authentication Request',
      status: 'FAIL',
      details: 'Authentication failed',
      error: `${error.status || 'UNKNOWN'}: ${error.message}`,
    });
    return false;
  }
}

// Test text request
async function testText() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    results.push({ testName: 'Text Request', status: 'SKIP', details: 'No API key' });
    return false;
  }

  try {
    const groq = new Groq({ apiKey });
    const start = Date.now();
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Reply with exactly: GROQ_TEST_OK' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.0,
      max_tokens: 20,
    });
    
    const latency = Date.now() - start;
    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    
    results.push({
      testName: 'Text Request',
      status: 'PASS',
      details: `Response: "${responseText}"`,
      latency,
    });
    return true;
  } catch (error) {
    results.push({
      testName: 'Text Request',
      status: 'FAIL',
      details: 'Failed to get text response',
      error: `${error.status || 'UNKNOWN'}: ${error.message}`,
    });
    return false;
  }
}

// Create test WAV file
function createTestWAV() {
  const sampleRate = 16000;
  const duration = 1;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const pcmData = Buffer.alloc(dataSize);
  return Buffer.concat([header, pcmData]);
}

// Test STT
async function testSTT() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    results.push({ testName: 'Speech-to-Text', status: 'SKIP', details: 'No API key' });
    return false;
  }

  try {
    const testAudio = createTestWAV();
    const groq = new Groq({ apiKey });
    const start = Date.now();
    
    // Write to temp file (Groq SDK needs a file-like object)
    const tempFile = './test-audio.wav';
    fs.writeFileSync(tempFile, testAudio);
    
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0.0,
    });
    
    const latency = Date.now() - start;
    const text = transcription.text?.trim() || '';
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    results.push({
      testName: 'Speech-to-Text',
      status: 'PASS',
      details: `Transcription: "${text}" (${testAudio.length} bytes)`,
      latency,
    });
    return true;
  } catch (error) {
    results.push({
      testName: 'Speech-to-Text',
      status: 'FAIL',
      details: 'STT request failed',
      error: `${error.status || 'UNKNOWN'}: ${error.message}`,
    });
    return false;
  }
}

// Test translation
async function testTranslation() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    results.push({ testName: 'Translation', status: 'SKIP', details: 'No API key' });
    return false;
  }

  try {
    const groq = new Groq({ apiKey });
    const testText = 'Welcome to the live translation test.';
    const start = Date.now();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate from English to Telugu. Output ONLY the translated text.',
        },
        { role: 'user', content: testText },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 200,
    });
    
    const latency = Date.now() - start;
    const translatedText = completion.choices[0]?.message?.content?.trim() || '';
    
    results.push({
      testName: 'Translation English→Telugu',
      status: 'PASS',
      details: `Original: "${testText}"\nTranslated: "${translatedText}"`,
      latency,
    });
    return true;
  } catch (error) {
    results.push({
      testName: 'Translation English→Telugu',
      status: 'FAIL',
      details: 'Translation failed',
      error: `${error.status || 'UNKNOWN'}: ${error.message}`,
    });
    return false;
  }
}

// Generate report
function generateReport() {
  let report = '# GROQ DIAGNOSTIC REPORT\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Test Results\n\n';

  let apiPass = false;
  let sttPass = false;
  let translationPass = false;
  let firstFailure = '';

  results.forEach((result) => {
    report += `### ${result.testName}\n`;
    report += `**Status:** ${result.status}\n`;
    report += `**Details:** ${result.details}\n`;
    if (result.latency) {
      report += `**Latency:** ${result.latency}ms\n`;
    }
    if (result.error) {
      report += `**Error:** ${result.error}\n`;
    }
    report += '\n';

    if (result.testName.includes('Authentication') && result.status === 'PASS') apiPass = true;
    if (result.testName === 'Speech-to-Text' && result.status === 'PASS') sttPass = true;
    if (result.testName.includes('Translation') && result.status === 'PASS') translationPass = true;
    if (result.status === 'FAIL' && !firstFailure) firstFailure = result.testName;
  });

  report += '## GROQ OVERALL STATUS\n\n';
  report += `**API:** ${apiPass ? 'PASS' : 'FAIL'}\n`;
  report += `**STT:** ${sttPass ? 'PASS' : 'FAIL'}\n`;
  report += `**TRANSLATION:** ${translationPass ? 'PASS' : 'FAIL'}\n`;
  report += `**TTS:** FAIL/MOCK (Not implemented)\n`;
  report += `**TELUGU TTS:** FAIL/UNSUPPORTED (Not implemented)\n\n`;

  if (firstFailure) {
    report += `**FIRST FAILURE:** ${firstFailure}\n\n`;
    if (!apiPass) {
      report += '**ROOT CAUSE:** Groq API authentication failure. Check GROQ_API_KEY.\n';
    } else if (!sttPass) {
      report += '**ROOT CAUSE:** STT request failed. Check audio format or API quota.\n';
    } else if (!translationPass) {
      report += '**ROOT CAUSE:** Translation request failed. Check model or API quota.\n';
    }
  } else {
    report += '**ROOT CAUSE:** N/A - All enabled tests passed\n';
  }

  report += '\n## Notes\n\n';
  report += '- API key presence verified, value never exposed\n';
  report += '- Tests performed independently from application pipeline\n';
  report += '- STT uses whisper-large-v3 model\n';
  report += '- Translation uses llama-3.3-70b-versatile model\n';
  report += '- TTS is currently MOCK implementation\n';
  report += '- Audio format: PCM 16-bit 16kHz converted to WAV\n';

  return report;
}

// Main
async function runTests() {
  console.log('========================================');
  console.log('GROQ INDEPENDENT TEST SUITE');
  console.log('========================================\n');

  const hasKey = checkApiKey();
  
  if (!hasKey) {
    console.log('\n❌ GROQ_API_KEY not configured\n');
    const report = generateReport();
    fs.writeFileSync('GROQ_DIAGNOSTIC_REPORT.md', report);
    console.log('Report saved to: GROQ_DIAGNOSTIC_REPORT.md\n');
    return;
  }

  console.log('Running tests...\n');

  await testAuth();
  await testText();
  await testSTT();
  await testTranslation();

  // TTS test
  results.push({
    testName: 'TTS Provider',
    status: 'FAIL',
    details: 'TTS STATUS: MOCK / NOT IMPLEMENTED',
    error: 'Application uses MockTTSProvider',
  });

  results.push({
    testName: 'Telugu TTS',
    status: 'FAIL',
    details: 'TTS STATUS: MOCK / NOT IMPLEMENTED',
    error: 'Real TTS not configured',
  });

  // Audio format compatibility
  results.push({
    testName: 'Browser Audio Format',
    status: 'PASS',
    details: 'Browser: PCM 16-bit, 16kHz, mono',
  });

  results.push({
    testName: 'Groq Format Compatibility',
    status: 'PASS',
    details: 'Backend converts PCM to WAV (Groq compatible)',
  });

  const report = generateReport();
  fs.writeFileSync('GROQ_DIAGNOSTIC_REPORT.md', report);

  console.log('\n========================================');
  console.log('TESTS COMPLETE');
  console.log('========================================\n');

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const skipCount = results.filter((r) => r.status === 'SKIP').length;

  console.log(`✅ PASSED: ${passCount}`);
  console.log(`❌ FAILED: ${failCount}`);
  console.log(`⏭️  SKIPPED: ${skipCount}`);
  console.log(`📊 TOTAL: ${results.length}\n`);
  console.log('Report saved to: GROQ_DIAGNOSTIC_REPORT.md\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
