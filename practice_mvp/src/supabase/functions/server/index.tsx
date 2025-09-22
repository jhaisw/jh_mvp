import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-1aa0d6ee/health", (c) => {
  return c.json({ status: "ok" });
});

// AI 식재료 인식 엔드포인트
app.post("/make-server-1aa0d6ee/analyze-ingredient", async (c) => {
  try {
    const { imageData } = await c.req.json();
    
    if (!imageData) {
      return c.json({ success: false, error: "Image data is required" }, 400);
    }

    console.log('Received image data, length:', imageData.length);

    // 기본 이미지 형식 검증 (OpenAI API가 처리할 수 있는지 확인)
    if (!imageData.startsWith('data:image/')) {
      console.error('Invalid image data format:', imageData.substring(0, 50));
      return c.json({ 
        success: false, 
        error: "올바르지 않은 이미지 데이터 형식입니다." 
      }, 400);
    }

    // 이미지 데이터 기본 검증만 수행 (OpenAI가 지원하는 형식인지는 API에서 처리)
    console.log('Image data header:', imageData.substring(0, 50));

    // OpenAI API 키 확인
    const openaiKey = Deno.env.get('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');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return c.json({ 
        success: false, 
        error: "OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요." 
      }, 500);
    }

    console.log('OpenAI API key found, length:', openaiKey.length);
    
    // API 키 형식 검증 (OpenAI API 키는 sk-로 시작해야 함)
    if (!openaiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format');
      return c.json({ 
        success: false, 
        error: "잘못된 OpenAI API 키 형식입니다. 'sk-'로 시작하는 유효한 키를 입력해주세요." 
      }, 500);
    }

    // OpenAI Vision API 호출
    console.log('Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `이 이미지를 분석해주세요. 먼저 이미지가 무엇인지 판단하고, 적절한 분석을 수행하세요.

**1단계: 이미지 종류 판단**
- 식재료/음식 사진인가요?
- 영수증/쇼핑 리스트인가요?
- 텍스트가 포함된 문서인가요?

**2단계: 적절한 분석 수행**

**영수증/텍스트 문서인 경우:**
다음 JSON 형식으로 응답하세요:
{"type":"receipt","text":"추출된 전체 텍스트"}

**식재료/음식 사진인 경우:**
다음 JSON 형식으로 응답하세요:
{"type":"ingredients","ingredients":[{"name":"토마토","quantity":3,"confidence":85,"freshness":"good","storage":["실온보관 2-3일","냉장보관 1주일"],"recipes":["토마토 파스타 (조리시간: 20분)","토마토 샐러드 (조리시간: 5분)"],"nutrition":{"calories":18,"protein":0.9,"carbs":3.9,"fat":0.2,"vitamin":"C, K"},"tips":["빨간색이 진할수록 좋습니다","냉장보관시 맛이 떨어질 수 있습니다"]}],"totalCount":3}

응답 예시 (다중 식재료):
{"type":"ingredients","ingredients":[{"name":"사과","quantity":2,"confidence":90,"freshness":"excellent","storage":["냉장보관 2주일","실온보관 1주일"],"recipes":["사과 파이","사과 쥬스"],"nutrition":{"calories":52,"protein":0.3,"carbs":14,"fat":0.2,"vitamin":"C"},"tips":["껍질째 먹으면 더 영양가가 높습니다"]},{"name":"계란","quantity":6,"confidence":95,"freshness":"good","storage":["냉장보관 3-4주"],"recipes":["계란후라이","계란찜"],"nutrition":{"calories":68,"protein":6,"carbs":0.6,"fat":4.8,"vitamin":"B12, D"},"tips":["신선도 확인은 물에 띄워보세요"]}],"totalCount":8}

분석 가이드라인:
- 영수증인 경우: 모든 텍스트를 정확히 추출하여 text 필드에 포함
- 식재료인 경우: 과일, 채소, 고기, 생선, 유제품, 곡물, 견과류, 향신료, 조리된 음식 등 모든 식품을 분석
- 확실하지 않더라도 가장 가능성 높은 추측으로 응답하세요
- 여러 식재료가 보이면 각각을 모두 인식하여 배열로 만드세요
- 조리된 음식의 경우 주재료들을 각각 분석하세요
- 정말 음식과 전혀 관련이 없는 경우에만 name을 "알 수 없음"으로 설정하세요
- 각 식재료의 개수를 정확히 세어서 quantity 필드에 입력하세요
- 개수를 명확히 셀 수 없는 경우 1로 설정하세요
- totalCount는 모든 식재료의 quantity 합계입니다

응답 규칙:
1. 절대로 마크다운, 코드블록, 설명 텍스트 포함 금지
2. 오직 JSON 객체만 응답
3. 모든 문자열은 큰따옴표 사용
4. 숫자는 따옴표 없이 작성
5. 반드시 type 필드를 포함하여 "receipt" 또는 "ingredients" 값 설정`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      
      if (response.status === 401) {
        return c.json({ 
          success: false, 
          error: "OpenAI API 키가 유효하지 않습니다. API 키를 확인해주세요." 
        }, 401);
      }
      
      if (response.status === 400) {
        // 400 에러의 상세 내용 파싱
        try {
          const errorBody = JSON.parse(errorData);
          if (errorBody.error?.code === 'invalid_image_format') {
            return c.json({ 
              success: false, 
              error: "이미지 형식이 올바르지 않습니다. PNG, JPEG, GIF, WebP 형식의 이미지를 업로드해주세요." 
            }, 400);
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지
        }
        
        return c.json({ 
          success: false, 
          error: "이미지를 처리할 수 없습니다. 다른 이미지를 시도해주세요." 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: `OpenAI API 오류 (${response.status}): ${response.statusText}` 
      }, 500);
    }

    const aiResponse = await response.json();
    console.log('OpenAI API Response:', JSON.stringify(aiResponse, null, 2));
    
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      return c.json({ success: false, error: "AI에서 응답을 받지 못했습니다. 다시 시도해주세요." }, 500);
    }

    console.log('Raw AI response content:', content);

    try {
      // JSON 코드 블록 제거 및 정리
      let cleanContent = content.trim();
      console.log('Step 1 - Initial content:', cleanContent);
      
      // 여러 패턴의 코드 블록 제거
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '');
      console.log('Step 2 - After removing ```:', cleanContent);
      
      cleanContent = cleanContent.replace(/^`{3,}\s*/gm, '').replace(/\s*`{3,}$/gm, '');
      console.log('Step 3 - After removing multiple backticks:', cleanContent);
      
      // 추가 정리: 앞뒤 공백 및 개행 제거
      cleanContent = cleanContent.trim();
      console.log('Step 4 - After trim:', cleanContent);
      
      // JSON 객체가 아닌 경우 추출 시도
      if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
        console.log('Step 5 - Content does not start/end with braces, extracting JSON...');
        
        // JSON 객체 부분만 추출 시도 (첫 번째 { 부터 마지막 } 까지)
        const startIndex = cleanContent.indexOf('{');
        const endIndex = cleanContent.lastIndexOf('}');
        
        console.log('JSON boundaries:', { startIndex, endIndex });
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanContent = cleanContent.substring(startIndex, endIndex + 1);
          console.log('Step 5 - After extracting JSON object:', cleanContent);
        } else {
          console.error('Failed to find valid JSON boundaries');
          return c.json({ 
            success: false, 
            error: "AI 응답에서 유효한 JSON을 찾을 수 없습니다. 다시 시도해주세요." 
          }, 500);
        }
      }
      
      // 남은 마크다운 문법 제거
      cleanContent = cleanContent.replace(/^\s*json\s*/i, '').trim();
      console.log('Step 6 - Final cleaned content:', cleanContent);
      
      // JSON 유효성 사전 검사
      if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
        console.error('Final content is not a valid JSON object structure');
        return c.json({ 
          success: false, 
          error: "AI 응답이 올바른 JSON 형식이 아닙니다. 다시 시도해주세요." 
        }, 500);
      }
      
      console.log('Attempting JSON parse...');
      
      // JSON 파싱
      const aiData = JSON.parse(cleanContent);
      console.log('JSON parse successful:', aiData);
      
      // 영수증인 경우 텍스트 분석으로 연결
      if (aiData.type === 'receipt') {
        console.log('Detected receipt, extracting text:', aiData.text);
        
        if (!aiData.text || aiData.text.trim().length === 0) {
          return c.json({ 
            success: false, 
            error: "영수증에서 텍스트를 추출할 수 없습니다. 더 명확한 이미지로 다시 시도해주세요." 
          }, 400);
        }

        // 텍스트 분석 API 재호출
        const textAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: `다음은 영수증에서 추출한 텍스트입니다. 이 텍스트에서 식재료와 개수를 분석하여 완전한 정보를 제공하세요. 정확히 다음 JSON 형식으로만 응답하세요.

영수증 텍스트: "${aiData.text}"

응답 예시:
{"ingredients":[{"name":"토마토","quantity":3,"confidence":90,"freshness":"good","storage":["실온보관 2-3일","냉장보관 1주일","습도가 높은 곳은 피하세요"],"recipes":["토마토 파스타 (조리시간: 20분, 재료: 토마토, 파스타면, 올리브오일)","토마토 샐러드 (조리시간: 5분, 재료: 토마토, 양상추, 드레싱)","토마토 스프 (조리시간: 30분, 재료: 토마토, 양파, 육수)"],"nutrition":{"calories":18,"protein":0.9,"carbs":3.9,"fat":0.2,"vitamin":"C, K, 리코펜"},"tips":["빨간색이 진할수록 좋습니다","냉장보관시 맛이 떨어질 수 있습니다","꼭지 부분이 싱싱한 것을 선택하세요"]}],"totalCount":3}

분석 가이드라인:
- 영수증에서 언급된 모든 식재료를 찾아서 각각 완전한 정보로 분석하세요
- 가격, 브랜드명, 상품코드 등은 무시하고 식재료 이름만 추출하세요
- 개수가 명시된 경우 정확히 반영하세요 (kg, g 단위는 1개로 계산)
- 개수가 명시되지 않은 경우 1로 설정하세요
- 각 식재료마다 다음 정보를 반드시 포함하세요:
  * storage: 최소 3가지 보관 방법 (실온/냉장/냉동, 보관 기간, 주의사항)
  * recipes: 최소 3가지 요리법 (요리명, 조리시간, 주재료 포함)
  * nutrition: 상세한 영양 정보 (칼로리, 단백질, 탄수화물, 지방, 비타민/미네랄)
  * tips: 최소 3가지 유용한 팁 (선택법, 보관법, 활용법)
- freshness: 영수증에서 구매한 것이므로 "good" 또는 "excellent"로 설정
- confidence는 영수증 텍스트 품질에 따라 85-95 사이로 설정하세요
- 정말 식재료를 찾을 수 없는 경우에만 name을 "인식 불가"로 설정하세요
- totalCount는 모든 식재료의 quantity 합계입니다

필수 정보 예시:
- 사과: storage ["냉장보관 2-3주", "실온보관 1주일", "습기를 피해 보관"], recipes ["사과파이", "사과쥬스", "사과샐러드"], nutrition {calories: 52, protein: 0.3, carbs: 14, fat: 0.2, vitamin: "C, 식이섬유"}, tips ["껍질째 먹으면 영양가 높음", "갈변 방지를 위해 레몬즙 활용", "단단하고 색이 고른 것 선택"]
- 우유: storage ["냉장보관 필수", "개봉 후 3-5일 내 섭취", "직사광선 피해 보관"], recipes ["우유 푸딩", "라떼", "크림스프"], nutrition {calories: 42, protein: 3.4, carbs: 5, fat: 1, vitamin: "칼슘, 비타민D"}, tips ["유통기한 확인 필수", "개봉 후 냄새로 신선도 확인", "가열 시 거품 주의"]

응답 규칙:
1. 절대로 마크다운, 코드블록, 설명 텍스트 포함 금지
2. 오직 JSON 객체만 응답
3. 모든 문자열은 큰따옴표 사용
4. 숫자는 따옴표 없이 작성
5. 각 식재료마다 완전한 정보를 제공할 것`
              }
            ],
            max_tokens: 1500
          })
        });

        if (!textAnalysisResponse.ok) {
          return c.json({ 
            success: false, 
            error: "영수증 텍스트 분석 중 오류가 발생했습니다." 
          }, 500);
        }

        const textAnalysisResult = await textAnalysisResponse.json();
        const textContent = textAnalysisResult.choices?.[0]?.message?.content;

        if (!textContent) {
          return c.json({ 
            success: false, 
            error: "영수증 텍스트 분석에서 응답을 받지 못했습니다." 
          }, 500);
        }

        // 텍스트 분석 결과 파싱
        let cleanTextContent = textContent.trim();
        cleanTextContent = cleanTextContent.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '');
        cleanTextContent = cleanTextContent.replace(/^`{3,}\s*/gm, '').replace(/\s*`{3,}$/gm, '');
        cleanTextContent = cleanTextContent.trim();
        
        if (!cleanTextContent.startsWith('{') || !cleanTextContent.endsWith('}')) {
          const startIndex = cleanTextContent.indexOf('{');
          const endIndex = cleanTextContent.lastIndexOf('}');
          
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            cleanTextContent = cleanTextContent.substring(startIndex, endIndex + 1);
          }
        }

        const ingredientData = JSON.parse(cleanTextContent);
        
        // 영수증에서 추출된 데이터임을 표시
        ingredientData._warning = "영수���에서 추출된 정보입니다. 실제 구매한 식재료와 다를 수 있습니다.";
        
        // 기본값 설정 로직 실행 (아래 코드와 동일)
        if (!ingredientData.ingredients || !Array.isArray(ingredientData.ingredients) || ingredientData.ingredients.length === 0) {
          return c.json({ 
            success: false, 
            error: "영수증에서 식재료를 찾을 수 없습니다. 식재료가 포함된 영수증인지 확인해주세요." 
          }, 400);
        }

        let warningMessage = ingredientData._warning;
        let hasUnknownIngredient = false;
        
        ingredientData.ingredients = ingredientData.ingredients.map(ingredient => {
          if (ingredient.name === "인식 불가") {
            hasUnknownIngredient = true;
          }
          
          ingredient.quantity = ingredient.quantity || 1;
          ingredient.confidence = ingredient.confidence || 90;
          ingredient.freshness = ingredient.freshness || 'good';
          
          // 더 구체적인 기본값 설정
          if (!ingredient.storage || ingredient.storage.length === 0) {
            ingredient.storage = [
              `${ingredient.name}을(를) 서늘하고 건조한 곳에 보관하세요`,
              `냉장보관으로 신선도를 유지하세요`,
              `직사광선을 피해 보관하세요`
            ];
          }
          
          if (!ingredient.recipes || ingredient.recipes.length === 0) {
            ingredient.recipes = [
              `${ingredient.name} 볶음 (조리시간: 15분)`,
              `${ingredient.name} 샐러드 (조리시간: 5분)`,
              `${ingredient.name} 스프 (조리시간: 20분)`
            ];
          }
          
          if (!ingredient.nutrition || Object.keys(ingredient.nutrition).length === 0) {
            ingredient.nutrition = {
              calories: 50,
              protein: 1.0,
              carbs: 10.0,
              fat: 0.5,
              vitamin: '비타민 C, 식이섬유'
            };
          }
          
          if (!ingredient.tips || ingredient.tips.length === 0) {
            ingredient.tips = [
              `신선한 ${ingredient.name}을(를) 선택하세요`,
              `적절한 보관으로 오래 유지하세요`,
              `다양한 요리법으로 활용해보세요`
            ];
          }
          
          return ingredient;
        });

        if (hasUnknownIngredient && ingredientData.ingredients.length === 1) {
          return c.json({ 
            success: false, 
            error: "영수증에서 식재료를 인식할 수 없습니다. 다른 영수증을 시도하거나 직접 텍스트로 입력해주세요." 
          }, 400);
        }
        
        ingredientData.totalCount = ingredientData.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0);

        console.log('Receipt ingredient analysis completed:', ingredientData.ingredients.length, 'ingredients found');
        
        const response = { success: true, data: ingredientData };
        if (warningMessage) {
          response.warning = warningMessage;
        }
        
        return c.json(response);
      }
      
      // 식재료 이미지인 경우 기존 로직 유지
      const ingredientData = aiData;
      
      // 데이터 검증 및 기본값 설정
      if (!ingredientData.ingredients || !Array.isArray(ingredientData.ingredients) || ingredientData.ingredients.length === 0) {
        return c.json({ 
          success: false, 
          error: "AI 응답에서 식재료 정보를 찾을 수 없습니다. 다시 시도해주세요." 
        }, 500);
      }

      // 각 식재료에 대해 기본값 설정 및 검증
      let warningMessage = null;
      let hasUnknownIngredient = false;
      
      ingredientData.ingredients = ingredientData.ingredients.map(ingredient => {
        // "알 수 없음"인 경우 체크
        if (ingredient.name === "알 수 없음") {
          hasUnknownIngredient = true;
        }
        
        // 필수 필드 기본값 설정
        ingredient.quantity = ingredient.quantity || 1;
        ingredient.confidence = ingredient.confidence || 70;
        ingredient.freshness = ingredient.freshness || 'good';
        
        // 더 구체적인 기본값 설정
        if (!ingredient.storage || ingredient.storage.length === 0) {
          ingredient.storage = [
            `${ingredient.name}을(를) 서늘하고 건조한 곳에 보관하세요`,
            `냉장보관으로 신선도를 유지하세요`,
            `직사광선을 피해 보관하세요`
          ];
        }
        
        if (!ingredient.recipes || ingredient.recipes.length === 0) {
          ingredient.recipes = [
            `${ingredient.name} 볶음 (조리시간: 15분)`,
            `${ingredient.name} 샐러드 (조리시간: 5분)`,
            `${ingredient.name} 스프 (조리시간: 20분)`
          ];
        }
        
        if (!ingredient.nutrition || Object.keys(ingredient.nutrition).length === 0) {
          ingredient.nutrition = {
            calories: 50,
            protein: 1.0,
            carbs: 10.0,
            fat: 0.5,
            vitamin: '비타민 C, 식이섬유'
          };
        }
        
        if (!ingredient.tips || ingredient.tips.length === 0) {
          ingredient.tips = [
            `신선한 ${ingredient.name}을(를) 선택하세요`,
            `적절한 보관으로 오래 유지하세요`,
            `다양한 요리법으로 활용해보세요`
          ];
        }
        
        // 신뢰도가 낮은 경우 경고 메시지 준비
        if (ingredient.confidence < 70) {
          warningMessage = "일부 식재료의 AI 인식 신뢰도가 낮습니다. 결과를 참고용으로만 사용하세요.";
        }
        
        return ingredient;
      });

      // 모든 식재료가 "알 수 없음"인 경우에만 에러 처리
      if (hasUnknownIngredient && ingredientData.ingredients.length === 1) {
        return c.json({ 
          success: false, 
          error: "이미지에서 음식이나 식재료를 인식할 수 없습니다. 음식이나 식재료가 명확하게 보이는 사진을 업로드해주세요." 
        }, 400);
      }
      
      // totalCount 계산
      ingredientData.totalCount = ingredientData.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0);

      console.log('AI ingredient analysis completed:', ingredientData.ingredients.length, 'ingredients found');
      
      const response: any = { success: true, data: ingredientData };
      if (warningMessage) {
        response.warning = warningMessage;
      }
      
      return c.json(response);

    } catch (parseError) {
      console.error('JSON parsing error details:', {
        name: parseError.name,
        message: parseError.message,
        stack: parseError.stack
      });
      console.error('Original AI Response:', content);
      
      // 더 자세한 에러 정보 제공
      if (parseError.message.includes('Unexpected token')) {
        const tokenMatch = parseError.message.match(/Unexpected token '(.+?)'/);
        const token = tokenMatch ? tokenMatch[1] : 'unknown';
        
        console.error(`Unexpected token found: '${token}'`);
        
        return c.json({ 
          success: false, 
          error: `AI 응답에 잘못된 문자('${token}')가 포함되어 있습니다. 다시 시도해주세요.` 
        }, 500);
      } else if (parseError.message.includes('Unexpected end of JSON')) {
        return c.json({ 
          success: false, 
          error: "AI 응답이 완전하지 않습니다. 다시 시도해주세요." 
        }, 500);
      } else {
        // 파싱 실패 시 기본 응답 제공
        console.log('Providing fallback response due to parsing error');
        
        const fallbackData = {
          ingredients: [{
            name: "알 수 없는 식품",
            quantity: 1,
            confidence: 50,
            freshness: "good",
            storage: ["안전한 보관을 위해 냉장 보관을 권장합니다"],
            recipes: ["정확한 식재료 확인 후 요리해주세요"],
            nutrition: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              vitamin: "정보 없음"
            },
            tips: ["더 명확한 이미지로 다시 시도해보세요", "조명이 좋은 곳에서 촬영해보세요"]
          }],
          totalCount: 1
        };
        
        return c.json({ 
          success: true, 
          data: fallbackData,
          warning: "AI 응답 처리 중 문제가 발생하여 기본 정보를 제공합니다."
        });
      }
    }

  } catch (error) {
    console.error('Ingredient analysis error:', error);
    return c.json({ success: false, error: error.message || "식재료 분석 중 오류가 발생했습니다" }, 500);
  }
});

// 식재료 인식 결과 저장
app.post("/make-server-1aa0d6ee/ingredients", async (c) => {
  try {
    const body = await c.req.json();
    const { imageData, ingredientData, timestamp } = body;
    
    // 고유 ID 생성
    const id = crypto.randomUUID();
    
    // 데이터베이스에 저장
    const record = {
      id,
      imageData,
      ingredientData,
      timestamp,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`ingredient:${id}`, record);
    
    console.log(`Ingredient record saved with ID: ${id}`);
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Error saving ingredient record:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 최근 식재료 인식 기록 조회
app.get("/make-server-1aa0d6ee/ingredients/recent", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    
    // 최근 기록들 조회
    const records = await kv.getByPrefix("ingredient:");
    
    // 시간순으로 정렬하여 최근 기록부터 반환
    const sortedRecords = records
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    console.log(`Retrieved ${sortedRecords.length} recent ingredient records`);
    return c.json({ success: true, records: sortedRecords });
  } catch (error) {
    console.error("Error retrieving ingredient records:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 특정 식재료 기록 조회
app.get("/make-server-1aa0d6ee/ingredients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const record = await kv.get(`ingredient:${id}`);
    
    if (!record) {
      return c.json({ success: false, error: "Record not found" }, 404);
    }
    
    console.log(`Retrieved ingredient record: ${id}`);
    return c.json({ success: true, record });
  } catch (error) {
    console.error("Error retrieving ingredient record:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 식재료 기록 삭제
app.delete("/make-server-1aa0d6ee/ingredients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // 기록이 존재하는지 확인
    const record = await kv.get(`ingredient:${id}`);
    if (!record) {
      return c.json({ success: false, error: "Record not found" }, 404);
    }
    
    // 기록 삭제
    await kv.del(`ingredient:${id}`);
    
    console.log(`Ingredient record deleted: ${id}`);
    return c.json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting ingredient record:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 냉장고 식재료 추가/업데이트
app.post("/make-server-1aa0d6ee/fridge/ingredients", async (c) => {
  try {
    const { ingredients } = await c.req.json();
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return c.json({ success: false, error: "Ingredients array is required" }, 400);
    }
    
    // 기존 냉장고 데이터 조회
    const existingFridge = await kv.get("fridge:ingredients") || [];
    let fridgeIngredients = Array.isArray(existingFridge) ? existingFridge : [];
    
    // 새로운 식재료들 추가/업데이트
    for (const newIngredient of ingredients) {
      const existingIndex = fridgeIngredients.findIndex(
        item => item.name.toLowerCase() === newIngredient.name.toLowerCase()
      );
      
      const fridgeItem = {
        id: existingIndex >= 0 ? fridgeIngredients[existingIndex].id : crypto.randomUUID(),
        name: newIngredient.name,
        quantity: existingIndex >= 0 
          ? fridgeIngredients[existingIndex].quantity + newIngredient.quantity
          : newIngredient.quantity,
        freshness: newIngredient.freshness,
        storage: newIngredient.storage,
        addedAt: existingIndex >= 0 
          ? fridgeIngredients[existingIndex].addedAt 
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiryDate: null // 기본값으로 null 설정
      };
      
      if (existingIndex >= 0) {
        fridgeIngredients[existingIndex] = fridgeItem;
      } else {
        fridgeIngredients.push(fridgeItem);
      }
    }
    
    // 냉장고 데이터 저장
    await kv.set("fridge:ingredients", fridgeIngredients);
    
    console.log(`Updated fridge with ${ingredients.length} ingredients`);
    return c.json({ success: true, ingredients: fridgeIngredients });
  } catch (error) {
    console.error("Error updating fridge ingredients:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 냉장고 식재료 조회
app.get("/make-server-1aa0d6ee/fridge/ingredients", async (c) => {
  try {
    const fridgeIngredients = await kv.get("fridge:ingredients") || [];
    
    console.log(`Retrieved ${fridgeIngredients.length} fridge ingredients`);
    return c.json({ success: true, ingredients: fridgeIngredients });
  } catch (error) {
    console.error("Error retrieving fridge ingredients:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 냉장고 식재료 개별 수정
app.put("/make-server-1aa0d6ee/fridge/ingredients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { name, quantity, expiryDate } = await c.req.json();
    
    // 기존 냉장고 데이터 조회
    const fridgeIngredients = await kv.get("fridge:ingredients") || [];
    
    const ingredientIndex = fridgeIngredients.findIndex(item => item.id === id);
    if (ingredientIndex === -1) {
      return c.json({ success: false, error: "Ingredient not found" }, 404);
    }
    
    // 식재료 정보 업데이트
    fridgeIngredients[ingredientIndex] = {
      ...fridgeIngredients[ingredientIndex],
      name: name || fridgeIngredients[ingredientIndex].name,
      quantity: quantity !== undefined ? quantity : fridgeIngredients[ingredientIndex].quantity,
      expiryDate: expiryDate !== undefined ? expiryDate : fridgeIngredients[ingredientIndex].expiryDate,
      updatedAt: new Date().toISOString()
    };
    
    // 냉장고 데이터 저장
    await kv.set("fridge:ingredients", fridgeIngredients);
    
    console.log(`Updated fridge ingredient: ${id}`);
    return c.json({ success: true, ingredient: fridgeIngredients[ingredientIndex] });
  } catch (error) {
    console.error("Error updating fridge ingredient:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 냉장고 식재료 개별 삭제
app.delete("/make-server-1aa0d6ee/fridge/ingredients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // 기존 냉장고 데이터 조회
    let fridgeIngredients = await kv.get("fridge:ingredients") || [];
    
    const originalLength = fridgeIngredients.length;
    fridgeIngredients = fridgeIngredients.filter(item => item.id !== id);
    
    if (fridgeIngredients.length === originalLength) {
      return c.json({ success: false, error: "Ingredient not found" }, 404);
    }
    
    // 냉장고 데이터 저장
    await kv.set("fridge:ingredients", fridgeIngredients);
    
    console.log(`Deleted fridge ingredient: ${id}`);
    return c.json({ success: true, message: "Ingredient deleted successfully" });
  } catch (error) {
    console.error("Error deleting fridge ingredient:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 냉장고 식재료 기반 레시피 추천
app.post("/make-server-1aa0d6ee/recipes/recommend", async (c) => {
  try {
    const { ingredients, userRequest } = await c.req.json();
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return c.json({ success: false, error: "냉장고에 식재료가 없습니다" }, 400);
    }
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ success: false, error: 'OpenAI API 키가 설정되지 않았습니다' }, 500);
    }
    
    const ingredientList = ingredients.map(ing => `${ing.name} ${ing.quantity}개`).join(', ');
    
    // 사용자 요청사항이 있으면 프롬프트에 포함
    const userRequestText = userRequest && userRequest.trim() ? `

사용자 요청사항: ${userRequest.trim()}` : '';
    
    const prompt = `당신은 레시피 추천 전문가입니다. 다음 냉장고 식재료들을 기반으로 만들 수 있는 요리 3-5개를 추천해주세요:

보유 식재료: ${ingredientList}${userRequestText}

반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트나 설명은 절대 포함하지 마세요:

{
  "recipes": [
    {
      "name": "요리 이름",
      "difficulty": "쉬움",
      "cookingTime": "30분",
      "servings": "2인분",
      "description": "요리에 대한 간단한 설명",
      "availableIngredients": ["사용 가능한 보유 식재료"],
      "missingIngredients": ["부족한 식재료 (없으면 빈 배열)"],
      "category": "한식"
    }
  ]
}

규칙:
- 보유 식재료만으로 만들 수 있는 요리 우선 추천
- 1-2개 재료만 부족한 현실적 요리 포함${userRequest && userRequest.trim() ? `
- 사용자 요청사항을 최대한 반영하여 추천` : ''}
- difficulty는 "쉬움", "보통", "어려움" 중 하나
- category는 "한식", "양식", "중식", "일식", "디저트", "기타" 중 하나
- 응답은 순수 JSON만, 코드블록이나 다른 텍스트 없이`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json({ success: false, error: `OpenAI API 오류: ${response.status}` }, 500);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return c.json({ success: false, error: 'AI 응답이 비어있습니다' }, 500);
    }

    // JSON 추출 및 파싱 개선
    let jsonContent = content.trim();
    
    // 코드블록 제거
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // 앞뒤 여분의 텍스트 제거하고 JSON 객체 추출
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    try {
      const parsedContent = JSON.parse(jsonContent);
      
      // 응답 구조 검증
      if (!parsedContent.recipes || !Array.isArray(parsedContent.recipes)) {
        throw new Error('잘못된 응답 구조: recipes 배열이 없습니다');
      }
      
      // 레시피 데이터 검증 및 보정
      const validatedRecipes = parsedContent.recipes.map((recipe, index) => {
        return {
          name: recipe.name || `추천 레시피 ${index + 1}`,
          difficulty: ['쉬움', '보통', '어려움'].includes(recipe.difficulty) ? recipe.difficulty : '보통',
          cookingTime: recipe.cookingTime || '30분',
          servings: recipe.servings || '2인분',
          description: recipe.description || '맛있는 요리입니다',
          availableIngredients: Array.isArray(recipe.availableIngredients) ? recipe.availableIngredients : [],
          missingIngredients: Array.isArray(recipe.missingIngredients) ? recipe.missingIngredients : [],
          category: ['한식', '양식', '중식', '일식', '디저트', '기타'].includes(recipe.category) ? recipe.category : '기타'
        };
      });
      
      console.log(`Recipe recommendations generated successfully: ${validatedRecipes.length} recipes`);
      return c.json({ success: true, data: { recipes: validatedRecipes } });
      
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 AI 응답:', content);
      console.error('정제된 JSON:', jsonContent);
      
      // 파싱 실패 시 기본 레시피 제공
      const fallbackRecipes = [
        {
          name: "간단한 볶음밥",
          difficulty: "쉬움",
          cookingTime: "15분",
          servings: "1인분",
          description: "냉장고 재료로 만드는 간단한 볶음밥",
          availableIngredients: ingredients.slice(0, 3).map(ing => ing.name),
          missingIngredients: ["밥", "간장"],
          category: "한식"
        },
        {
          name: "야채 스프",
          difficulty: "쉬움", 
          cookingTime: "20분",
          servings: "2인분",
          description: "영양가득한 야채 스프",
          availableIngredients: ingredients.slice(0, 2).map(ing => ing.name),
          missingIngredients: ["물", "소금"],
          category: "양식"
        }
      ];
      
      return c.json({ 
        success: true, 
        data: { recipes: fallbackRecipes },
        warning: 'AI 응답 파싱에 실패하여 기본 레시피를 제공합니다'
      });
    }
    
  } catch (error) {
    console.error("Error generating recipe recommendations:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 상세 레시피 생성
app.post("/make-server-1aa0d6ee/recipes/detail", async (c) => {
  try {
    const { recipeName, ingredients } = await c.req.json();
    
    if (!recipeName) {
      return c.json({ success: false, error: "레시피 이름이 필요합니다" }, 400);
    }
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ success: false, error: 'OpenAI API 키가 설정되지 않았습니다' }, 500);
    }
    
    const ingredientList = ingredients ? ingredients.map(ing => `${ing.name} ${ing.quantity}개`).join(', ') : '';
    
    const prompt = `당신은 요리 전문가입니다. "${recipeName}" 요리의 상세한 레시피를 제공해주세요.

${ingredientList ? `보유 식재료: ${ingredientList}` : ''}

반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트나 설명은 절대 포함하지 마세요:

{
  "recipe": {
    "name": "${recipeName}",
    "description": "요리에 대한 상세한 설명",
    "difficulty": "쉬움",
    "cookingTime": "30분",
    "prepTime": "10분",
    "servings": "2인분",
    "calories": "400kcal",
    "ingredients": [
      {
        "name": "재료명",
        "amount": "필요한 양",
        "essential": true
      }
    ],
    "instructions": [
      {
        "step": 1,
        "title": "단계 제목",
        "description": "상세한 조리 방법",
        "tip": "조리 팁"
      }
    ],
    "tips": ["유용한 조리 팁들"],
    "nutrition": {
      "protein": "15g",
      "carbs": "45g",
      "fat": "12g",
      "fiber": "8g"
    },
    "tags": ["간단", "건강", "맛있는"]
  }
}

규칙:
- 실제로 만들 수 있는 현실적인 레시피
- 초보자도 따라할 수 있게 친절하고 구체적으로 설명
- difficulty는 "쉬움", "보통", "어려움" 중 하나
- 응답은 순수 JSON만, 코드블록이나 다른 텍스트 없이`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json({ success: false, error: `OpenAI API 오류: ${response.status}` }, 500);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return c.json({ success: false, error: 'AI 응답이 비어있습니다' }, 500);
    }

    // JSON 추출 및 파싱 개선
    let jsonContent = content.trim();
    
    // 코드블록 제거
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // 앞뒤 여분의 텍스트 제거하고 JSON 객체 추출
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    try {
      const parsedContent = JSON.parse(jsonContent);
      
      // 응답 구조 검증
      if (!parsedContent.recipe) {
        throw new Error('잘못된 응답 구조: recipe 객체가 없습니다');
      }
      
      const recipe = parsedContent.recipe;
      
      // 레시피 데이터 검증 및 보정
      const validatedRecipe = {
        name: recipe.name || recipeName,
        description: recipe.description || `${recipeName}에 대한 맛있는 레시피입니다`,
        difficulty: ['쉬움', '보통', '어려움'].includes(recipe.difficulty) ? recipe.difficulty : '보통',
        cookingTime: recipe.cookingTime || '30분',
        prepTime: recipe.prepTime || '10분',
        servings: recipe.servings || '2인분',
        calories: recipe.calories || '400kcal',
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => ({
          name: ing.name || '재료',
          amount: ing.amount || '적당량',
          essential: typeof ing.essential === 'boolean' ? ing.essential : true
        })) : [
          { name: '주재료', amount: '적당량', essential: true }
        ],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map((inst, idx) => ({
          step: inst.step || idx + 1,
          title: inst.title || `단계 ${idx + 1}`,
          description: inst.description || '조리 과정을 진행하세요',
          tip: inst.tip || undefined
        })) : [
          { step: 1, title: '조리 시작', description: `${recipeName}을(를) 맛있게 조리하세요` }
        ],
        tips: Array.isArray(recipe.tips) ? recipe.tips : [`${recipeName}을(를) 맛있게 드세요`],
        nutrition: {
          protein: recipe.nutrition?.protein || '15g',
          carbs: recipe.nutrition?.carbs || '45g',
          fat: recipe.nutrition?.fat || '12g',
          fiber: recipe.nutrition?.fiber || '8g'
        },
        tags: Array.isArray(recipe.tags) ? recipe.tags : ['맛있는', '건강한']
      };
      
      console.log(`Detailed recipe generated successfully for: ${recipeName}`);
      return c.json({ success: true, data: { recipe: validatedRecipe } });
      
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 AI 응답:', content);
      console.error('정제된 JSON:', jsonContent);
      
      // 파싱 실패 시 기본 레시피 제공
      const fallbackRecipe = {
        name: recipeName,
        description: `${recipeName}에 대한 기본 레시피입니다`,
        difficulty: "보통",
        cookingTime: "30분",
        prepTime: "10분",
        servings: "2인분",
        calories: "400kcal",
        ingredients: [
          { name: "주재료", amount: "적당량", essential: true },
          { name: "조미료", amount: "약간", essential: false }
        ],
        instructions: [
          { step: 1, title: "재료 준비", description: "필요한 재료들을 준비합니다" },
          { step: 2, title: "조리 시작", description: `${recipeName}을(를) 조리합니다` },
          { step: 3, title: "완성", description: "맛있게 완성하여 드세요" }
        ],
        tips: ["신선한 재료를 사용하세요", "중간 불에서 조리하세요"],
        nutrition: {
          protein: "15g",
          carbs: "45g", 
          fat: "12g",
          fiber: "8g"
        },
        tags: ["간단", "맛있는"]
      };
      
      return c.json({ 
        success: true, 
        data: { recipe: fallbackRecipe },
        warning: 'AI 응답 파싱에 실패하여 기본 레시피를 제공합니다'
      });
    }
    
  } catch (error) {
    console.error("Error generating detailed recipe:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 텍스트 기반 식재료 인식 API
app.post("/make-server-1aa0d6ee/analyze-text", async (c) => {
  try {
    const { text } = await c.req.json();
    
    if (!text) {
      return c.json({ success: false, error: "Text is required" }, 400);
    }

    console.log('Analyzing text:', text);

    // OpenAI API 키 확인
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return c.json({ 
        success: false, 
        error: "OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요." 
      }, 500);
    }

    // OpenAI API 호출
    console.log('Calling OpenAI API for text analysis...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `다음 텍스트에서 식재료와 개수를 분석하여 정보를 제공하세요. 정확히 다음 JSON 형식으로만 응답하세요.

텍스트: "${text}"

응답 예시 (단일 식재료):
{"ingredients":[{"name":"토마토","quantity":3,"confidence":95,"freshness":"good","storage":["실온보관 2-3일","냉장보관 1주일"],"recipes":["토마토 파스타 (조리시간: 20분)","토마토 샐러드 (조리시간: 5분)"],"nutrition":{"calories":18,"protein":0.9,"carbs":3.9,"fat":0.2,"vitamin":"C, K"},"tips":["빨간색이 진할수록 좋습니다","냉장보관시 맛이 떨어질 수 있습니다"]}],"totalCount":3}

응답 예시 (다중 식재료):
{"ingredients":[{"name":"사과","quantity":2,"confidence":95,"freshness":"excellent","storage":["냉장보관 2주일","실온보관 1주일"],"recipes":["사과 파이","사과 쥬스"],"nutrition":{"calories":52,"protein":0.3,"carbs":14,"fat":0.2,"vitamin":"C"},"tips":["껍질째 먹으면 더 영양가가 높습니다"]},{"name":"계란","quantity":6,"confidence":95,"freshness":"good","storage":["냉장보관 3-4주"],"recipes":["계란후라이","계란찜"],"nutrition":{"calories":68,"protein":6,"carbs":0.6,"fat":4.8,"vitamin":"B12, D"},"tips":["신선도 확인은 물에 띄워보세요"]}],"totalCount":8}

분석 가이드라인:
- 텍스트에서 언급된 모든 식재료를 찾아서 각각 분석하세요
- 개수가 명시된 경우 정확히 반영하세요 ("3개", "두 개", "한 박스", "12개들이" 등 다양한 표현 인식)
- 개수가 명시되지 않은 경우 1로 설정하세요
- "한 박스", "한 꾸러미" 등의 경우 일반적인 개수로 추정하세요 (사과 한 박스 = 10개 정도)
- 확실하지 않더라도 가장 가능성 높은 추측으로 응답하세요
- confidence는 텍스트 명확도에 따라 85-95 사이로 설정하세요
- 정말 식재료를 찾을 수 없는 경우에만 name을 "인식 불가"로 설정하세요
- totalCount는 모든 식재료의 quantity 합계입니다

응답 규칙:
1. 절대로 마크다운, 코드블록, 설명 텍스트 포함 금지
2. 오직 JSON 객체만 응답
3. 모든 문자열은 큰따옴표 사용
4. 숫자는 따옴표 없이 작성
5. 불확실하더라도 최선의 추측으로 응답

필수 필드:
- ingredients: 식재료 배열 (최소 1개)
- totalCount: 모든 식재료 개수의 합계
각 식재료 객체의 필수 필드:
- name: 한국어 식재료명
- quantity: 개수 (정수, 최소 1)
- confidence: 85-95 숫자
- freshness: "excellent", "good", "fair", "poor" 중 하나
- storage: 보관방법 배열
- recipes: 요리법 배열  
- nutrition: {calories, protein, carbs, fat, vitamin}
- tips: 유용한 팁 배열`
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      
      if (response.status === 401) {
        return c.json({ 
          success: false, 
          error: "OpenAI API 키가 유효하지 않습니다. API 키를 확인해주세요." 
        }, 401);
      }
      
      return c.json({ 
        success: false, 
        error: `OpenAI API 오류 (${response.status}): ${response.statusText}` 
      }, 500);
    }

    const aiResponse = await response.json();
    console.log('OpenAI API Response for text analysis:', JSON.stringify(aiResponse, null, 2));
    
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      return c.json({ success: false, error: "AI에서 응답을 받지 못했습니다. 다시 시도해주세요." }, 500);
    }

    console.log('Raw AI response content for text analysis:', content);

    try {
      // JSON 코드 블록 제거 및 정리
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '');
      cleanContent = cleanContent.replace(/^`{3,}\s*/gm, '').replace(/\s*`{3,}$/gm, '');
      cleanContent = cleanContent.trim();
      
      // JSON 객체가 아닌 경우 추출 시도
      if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
        const startIndex = cleanContent.indexOf('{');
        const endIndex = cleanContent.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanContent = cleanContent.substring(startIndex, endIndex + 1);
        } else {
          console.error('Failed to find valid JSON boundaries');
          return c.json({ 
            success: false, 
            error: "AI 응답에서 유효한 JSON을 찾을 수 없습니다. 다시 시도해주세요." 
          }, 500);
        }
      }
      
      cleanContent = cleanContent.replace(/^\s*json\s*/i, '').trim();
      
      console.log('Attempting JSON parse for text analysis...');
      
      // JSON 파싱
      const ingredientData = JSON.parse(cleanContent);
      console.log('JSON parse successful for text analysis:', ingredientData);
      
      // 데이터 검증 및 기본값 설정
      if (!ingredientData.ingredients || !Array.isArray(ingredientData.ingredients) || ingredientData.ingredients.length === 0) {
        return c.json({ 
          success: false, 
          error: "텍스트에서 식재료를 찾을 수 없습니다. 더 구체적으로 식재료 이름과 개수를 입력해주세요." 
        }, 400);
      }

      // 각 식재료에 대해 기본값 설정 및 검증
      let warningMessage = null;
      let hasUnknownIngredient = false;
      
      ingredientData.ingredients = ingredientData.ingredients.map(ingredient => {
        // "인식 불가"인 경우 체크
        if (ingredient.name === "인식 불가") {
          hasUnknownIngredient = true;
        }
        
        // 필수 필드 기본값 설정
        ingredient.quantity = ingredient.quantity || 1;
        ingredient.confidence = ingredient.confidence || 90;
        ingredient.freshness = ingredient.freshness || 'good';
        ingredient.storage = ingredient.storage || ['적절한 보관 방법을 확인해주세요'];
        ingredient.recipes = ingredient.recipes || ['다양한 요리법을 시도해보세요'];
        ingredient.nutrition = ingredient.nutrition || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          vitamin: '정보 없음'
        };
        ingredient.tips = ingredient.tips || ['더 자세한 정보는 검색해보세요'];
        
        return ingredient;
      });

      // 모든 식재료가 "인식 불가"인 경우에만 에러 처리
      if (hasUnknownIngredient && ingredientData.ingredients.length === 1) {
        return c.json({ 
          success: false, 
          error: "텍스트에서 식재료를 찾을 수 없습니다. 더 구체적으로 식재료 이름과 개수를 입력해주세요." 
        }, 400);
      }
      
      // totalCount 계산
      ingredientData.totalCount = ingredientData.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0);

      console.log('Text ingredient analysis completed:', ingredientData.ingredients.length, 'ingredients found');
      
      const response = { success: true, data: ingredientData };
      if (warningMessage) {
        response.warning = warningMessage;
      }
      
      return c.json(response);

    } catch (parseError) {
      console.error('JSON parsing error for text analysis:', parseError);
      
      return c.json({ 
        success: false, 
        error: "AI 응답 처리 중 오류가 발생했습니다. 다시 시도해주세요." 
      }, 500);
    }

  } catch (error) {
    console.error('Text ingredient analysis error:', error);
    return c.json({ success: false, error: error.message || "텍스트 식재료 분석 중 오류가 발생했습니다" }, 500);
  }
});

// 식재료 이름으로 정보 생성 API
app.post("/make-server-1aa0d6ee/ingredient-info", async (c) => {
  try {
    const { name, quantity } = await c.req.json();
    
    if (!name || !quantity) {
      return c.json({ success: false, error: "Name and quantity are required" }, 400);
    }

    console.log(`Generating info for ingredient: ${name} (${quantity}개)`);

    // OpenAI API 키 확인
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return c.json({ 
        success: false, 
        error: "OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요." 
      }, 500);
    }

    // OpenAI API 호출
    console.log('Calling OpenAI API for ingredient info...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `"${name}"이라는 식재료에 대한 정보를 제공하세요. 정확히 다음 JSON 형식으로만 응답하세요.

응답 예시:
{"name":"토마토","quantity":${quantity},"confidence":95,"freshness":"good","storage":["실온보관 2-3일","냉장보관 1주일"],"recipes":["토마토 파스타 (조리시간: 20분)","토마토 샐러드 (조리시간: 5분)","토마토 볶음밥 (조리시간: 15분)"],"nutrition":{"calories":18,"protein":0.9,"carbs":3.9,"fat":0.2,"vitamin":"C, K"},"tips":["빨간색이 진할수록 좋습니다","냉장보관시 맛이 떨어질 수 있습니다","요리할 때는 끓는 물에 데쳐서 껍질을 벗기세요"]}

분석 가이드라인:
- 식재료 이름은 정확히 "${name}"으로 설정하세요
- quantity는 정확히 ${quantity}으로 설정하세요
- confidence는 수동 입력이므로 90-95 사이로 설정하세요
- freshness는 일반적인 상태를 기준으로 설정하세요 ("excellent", "good", "fair", "poor" 중 선택)
- storage는 실용적인 보관 방법 2-3가지를 제공하세요
- recipes는 해당 식재료를 활용한 요리법 3-4가지를 제공하세요 (조리시간 포함)
- nutrition은 100g 기준으로 정확한 영양 정보를 제공하세요
- tips는 구매, 보관, 요리 시 유용한 팁 2-3가지를 제공하세요

응답 규칙:
1. 절대로 마크다운, 코드블록, 설명 텍스트 포함 금지
2. 오직 JSON 객체만 응답
3. 모든 문자열��� 큰따옴표 사용
4. 숫자는 따옴표 없이 작성
5. 실제 식재료 정보를 기반으로 정확한 정보 제공`
          }
        ],
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      
      if (response.status === 401) {
        return c.json({ 
          success: false, 
          error: "OpenAI API 키가 유효하지 않습니다. API 키를 확인해주세요." 
        }, 401);
      }
      
      return c.json({ 
        success: false, 
        error: `OpenAI API 오류 (${response.status}): ${response.statusText}` 
      }, 500);
    }

    const aiResponse = await response.json();
    console.log('OpenAI API Response for ingredient info:', JSON.stringify(aiResponse, null, 2));
    
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      return c.json({ success: false, error: "AI에서 응답을 받지 못했습니다. 다시 시도해주세요." }, 500);
    }

    console.log('Raw AI response content for ingredient info:', content);

    try {
      // JSON 코드 블록 제거 및 정리
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:json)?\\s*/gm, '').replace(/\\s*```$/gm, '');
      cleanContent = cleanContent.replace(/^`{3,}\\s*/gm, '').replace(/\\s*`{3,}$/gm, '');
      cleanContent = cleanContent.trim();
      
      // JSON 객체가 아닌 경우 추출 시도
      if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
        const startIndex = cleanContent.indexOf('{');
        const endIndex = cleanContent.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanContent = cleanContent.substring(startIndex, endIndex + 1);
        } else {
          console.error('Failed to find valid JSON boundaries');
          return c.json({ 
            success: false, 
            error: "AI 응답에서 유효한 JSON을 찾을 수 없습니다. 다시 시도해주세요." 
          }, 500);
        }
      }
      
      cleanContent = cleanContent.replace(/^\\s*json\\s*/i, '').trim();
      
      console.log('Attempting JSON parse for ingredient info...');
      
      // JSON 파싱
      const ingredientInfo = JSON.parse(cleanContent);
      console.log('JSON parse successful for ingredient info:', ingredientInfo);
      
      // 데이터 검증 및 기본값 설정
      ingredientInfo.name = ingredientInfo.name || name;
      ingredientInfo.quantity = ingredientInfo.quantity || quantity;
      ingredientInfo.confidence = ingredientInfo.confidence || 90;
      ingredientInfo.freshness = ingredientInfo.freshness || 'good';
      ingredientInfo.storage = ingredientInfo.storage || ['적절한 보관 방법을 확인해주세요'];
      ingredientInfo.recipes = ingredientInfo.recipes || ['다양한 요리법을 시도해보세요'];
      ingredientInfo.nutrition = ingredientInfo.nutrition || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        vitamin: '정보 없음'
      };
      ingredientInfo.tips = ingredientInfo.tips || ['더 자세한 정보는 검색해보세요'];
      
      console.log('Ingredient info generation completed:', ingredientInfo.name);
      
      return c.json({ success: true, data: ingredientInfo });

    } catch (parseError) {
      console.error('JSON parsing error for ingredient info:', parseError);
      
      // 파싱 실패 시 기본 응답 제공
      const fallbackData = {
        name,
        quantity,
        confidence: 90,
        freshness: 'good',
        storage: [`${name}을(를) 서늘하고 건조한 곳에 보관하세요`, `냉장보관을 권장합니다`],
        recipes: [`${name}을(를) 활용한 요리를 시도해보세요`, `신선한 상태로 섭취하세요`],
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          vitamin: '확인 필요'
        },
        tips: [`신선한 ${name}을(를) 선택하세요`, `적절한 보관으로 오래 유지하세요`]
      };
      
      return c.json({ 
        success: true, 
        data: fallbackData,
        warning: "AI 응답 처리 중 문제가 발생하여 기본 정보를 제공합니다."
      });
    }

  } catch (error) {
    console.error('Ingredient info generation error:', error);
    return c.json({ success: false, error: error.message || "식재료 정보 생성 중 오류가 발생했습니다" }, 500);
  }
});

Deno.serve(app.fetch);
