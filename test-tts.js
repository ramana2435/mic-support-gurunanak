/**
 * Google Cloud TTS Test Script
 * Tests Telugu TTS independently
 * Run: node test-tts.js
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
require('dotenv').config({ path: './apps/backend/.env' });

async function testGoogleTTS() {
  console.log('========================================');
  console.log('GOOGLE CLOUD TTS TEST');
  console.log('========================================\n');

  // Check credentials
  const hasCredentials = 
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    process.env.GOOGLE_CLOUD_KEY_JSON;

  if (!hasCredentials) {
    console.log('❌ No Google Cloud credentials configured\n');
    console.log('Please set one of:');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS (path to JSON key)');
    console.log('  - GOOGLE_CLOUD_KEY_JSON (inline JSON key)\n');
    return;
  }

  console.log('✅ Credentials configured\n');

  try {
    // Initialize client
    let client;
    if (process.env.GOOGLE_CLOUD_KEY_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
      client = new TextToSpeechClient({ credentials });
      console.log('Using GOOGLE_CLOUD_KEY_JSON\n');
    } else {
      client = new TextToSpeechClient();
      console.log('Using GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS, '\n');
    }

    // Test 1: English TTS
    console.log('Test 1: English TTS');
    console.log('Text: "Hello, this is a test of Google Cloud Text to Speech"');
    const start1 = Date.now();

    const englishRequest = {
      input: { text: 'Hello, this is a test of Google Cloud Text to Speech' },
      voice: { 
        languageCode: 'en-US', 
        name: 'en-US-Neural2-J',
        ssmlGender: 'MALE'
      },
      audioConfig: { 
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000
      },
    };

    const [englishResponse] = await client.synthesizeSpeech(englishRequest);
    const latency1 = Date.now() - start1;

    console.log('✅ English TTS successful');
    console.log('Audio size:', englishResponse.audioContent.length, 'bytes');
    console.log('Latency:', latency1, 'ms');
    console.log('Sample rate: 24000 Hz');
    console.log('Format: LINEAR16 (PCM)\n');

    // Save audio file
    fs.writeFileSync('test-english.wav', englishResponse.audioContent);
    console.log('Saved to: test-english.wav\n');

    // Test 2: Telugu TTS
    console.log('Test 2: Telugu TTS');
    console.log('Text: "హలో, ఇది గూగుల్ క్లౌడ్ టెక్స్ట్ టు స్పీచ్ పరీక్ష"');
    const start2 = Date.now();

    const teluguRequest = {
      input: { text: 'హలో, ఇది గూగుల్ క్లౌడ్ టెక్స్ట్ టు స్పీచ్ పరీక్ష' },
      voice: { 
        languageCode: 'te-IN', 
        name: 'te-IN-Standard-A',
        ssmlGender: 'FEMALE'
      },
      audioConfig: { 
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000
      },
    };

    const [teluguResponse] = await client.synthesizeSpeech(teluguRequest);
    const latency2 = Date.now() - start2;

    console.log('✅ Telugu TTS successful');
    console.log('Audio size:', teluguResponse.audioContent.length, 'bytes');
    console.log('Latency:', latency2, 'ms');
    console.log('Sample rate: 24000 Hz');
    console.log('Format: LINEAR16 (PCM)\n');

    // Save audio file
    fs.writeFileSync('test-telugu.wav', teluguResponse.audioContent);
    console.log('Saved to: test-telugu.wav\n');

    // Test 3: Long text (realistic translation)
    console.log('Test 3: Realistic Translation (Long Telugu text)');
    const longText = 'స్వాగతం. ఈ రోజు మనం కొత్త విషయాలు నేర్చుకోబోతున్నాం. దయచేసి శ్రద్ధగా వినండి.';
    console.log('Text:', longText);
    const start3 = Date.now();

    const longRequest = {
      input: { text: longText },
      voice: { 
        languageCode: 'te-IN', 
        name: 'te-IN-Standard-B',
        ssmlGender: 'MALE'
      },
      audioConfig: { 
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000
      },
    };

    const [longResponse] = await client.synthesizeSpeech(longRequest);
    const latency3 = Date.now() - start3;

    console.log('✅ Long Telugu TTS successful');
    console.log('Characters:', longText.length);
    console.log('Audio size:', longResponse.audioContent.length, 'bytes');
    console.log('Latency:', latency3, 'ms');
    console.log('Audio duration: ~', Math.round(longResponse.audioContent.length / 48000), 'seconds\n');

    fs.writeFileSync('test-telugu-long.wav', longResponse.audioContent);
    console.log('Saved to: test-telugu-long.wav\n');

    // Summary
    console.log('========================================');
    console.log('TESTS COMPLETE');
    console.log('========================================\n');
    console.log('✅ All tests passed');
    console.log('Average latency:', Math.round((latency1 + latency2 + latency3) / 3), 'ms');
    console.log('\nGoogle Cloud TTS is working correctly!');
    console.log('You can now use it in your application.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nCommon issues:');
    console.error('  - API not enabled: Enable Text-to-Speech API in Google Cloud Console');
    console.error('  - Invalid credentials: Check JSON key is valid');
    console.error('  - Permission denied: Ensure service account has "Cloud Text-to-Speech User" role');
    console.error('  - Billing not enabled: Link a billing account to your project\n');
  }
}

testGoogleTTS().catch(console.error);
