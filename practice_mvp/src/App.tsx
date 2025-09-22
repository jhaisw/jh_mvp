import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { IngredientResult } from './components/IngredientResult';
import { IngredientHistory } from './components/IngredientHistory';
import { Fridge } from './components/Fridge';
import { RecipeRecommendations } from './components/RecipeRecommendations';
import { Scan, Utensils, History, Home, Refrigerator, ChefHat } from 'lucide-react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { toast } from "sonner@2.0.3";
import { Toaster } from './components/ui/sonner';
import fridgeAppIcon from 'figma:asset/ac4e0ab159af3455d1f8f70931dd473f2cd83189.png';

interface IngredientData {
  name: string;
  quantity: number;
  confidence: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  storage: string[];
  recipes: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    vitamin: string;
  };
  tips: string[];
  _warning?: string; // AI 응답 경고 메시지
}

interface MultipleIngredientsData {
  ingredients: IngredientData[];
  totalCount: number;
  _warning?: string;
}

interface FridgeIngredient {
  id: string;
  name: string;
  quantity: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  storage: string[];
  addedAt: string;
  updatedAt: string;
  expiryDate: string | null;
}

// Server API functions
const saveIngredientRecord = async (imageData: string, ingredientData: IngredientData) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/ingredients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      imageData,
      ingredientData,
      timestamp: new Date().toISOString()
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to save record');
  }
  return result;
};

const getRecentRecords = async (limit = 10) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/ingredients/recent?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch records');
  }
  return result.records;
};

const deleteRecord = async (id: string) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/ingredients/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete record');
  }
  return result;
};

// 냉장고 관련 API 함수들
const addToFridge = async (ingredients: IngredientData[]) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/fridge/ingredients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ ingredients })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to add ingredients to fridge');
  }
  return result.ingredients;
};

const getFridgeIngredients = async () => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/fridge/ingredients`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch fridge ingredients');
  }
  return result.ingredients;
};

const updateFridgeIngredient = async (id: string, updates: Partial<FridgeIngredient>) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/fridge/ingredients/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify(updates)
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to update fridge ingredient');
  }
  return result.ingredient;
};

const deleteFridgeIngredient = async (id: string) => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/fridge/ingredients/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete fridge ingredient');
  }
  return result;
};

// 식재료 이름으로 정보 생성 함수
const generateIngredientInfo = async (name: string, quantity: number): Promise<IngredientData> => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/ingredient-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ name, quantity })
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || '식재료 정보 생성에 실패했습니다');
  }

  return result.data;
};

// AI 식재료 인식 함수 (OpenAI Vision API 사용)
const recognizeIngredient = async (file: File): Promise<MultipleIngredientsData> => {
  // 이미지를 base64로 변환
  const reader = new FileReader();
  const imageDataPromise = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      console.log('Base64 conversion successful, header:', result.substring(0, 50));
      resolve(result);
    };
    reader.onerror = (error) => {
      console.error('Base64 conversion failed:', error);
      reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    };
    reader.readAsDataURL(file);
  });

  const imageData = await imageDataPromise;

  // base64 데이터 유효성 검증
  if (!imageData || !imageData.includes(',')) {
    throw new Error('이미지 데이터 변환에 실패했습니다.');
  }

  // 서버 API 호출
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/analyze-ingredient`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ imageData })
  });

  const result = await response.json();
  
  if (!result.success) {
    // API 키 관련 에러인 경우 더 구체적인 안내
    if (result.error.includes('API 키')) {
      throw new Error(`${result.error}\n\n해결 방법:\n1. OpenAI 계정에서 유효한 API 키를 발급받으세요\n2. 환경 변수에 올바른 키를 설정해주세요`);
    }
    throw new Error(result.error || 'AI 식재료 인식에 실패했습니다');
  }

  // 경고 메시지가 있는 경우 처리
  if (result.warning) {
    console.warn('AI 응답 경고:', result.warning);
    // 경고를 데이터에 포함시켜 나중에 UI에서 표시할 수 있도록 함
    result.data._warning = result.warning;
  }

  return result.data;
};

// 텍스트 입력을 위한 플레이스홀더 이미지 생성 함수
const generateTextPlaceholderImage = (text: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 캔버스 크기 설정
  canvas.width = 400;
  canvas.height = 200;
  
  if (!ctx) {
    // Canvas를 지원하지 않는 경우 기본 텍스트 이미지 URL 반환
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f3f3f5"/>
        <text x="200" y="80" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#030213">📝 텍스트 입력</text>
        <text x="200" y="120" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#717182">${text.length > 30 ? text.substring(0, 30) + '...' : text}</text>
      </svg>
    `);
  }
  
  // 배경 그리기
  ctx.fillStyle = '#f3f3f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 테두리 그리기
  ctx.strokeStyle = '#cbced4';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  
  // 아이콘 텍스트 그리기
  ctx.fillStyle = '#030213';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📝', canvas.width / 2, 60);
  
  // 제목 그리기
  ctx.fillStyle = '#030213';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('텍스트 입력', canvas.width / 2, 100);
  
  // 입력된 텍스트 일부 표시
  ctx.fillStyle = '#717182';
  ctx.font = '14px Arial, sans-serif';
  const displayText = text.length > 40 ? text.substring(0, 40) + '...' : text;
  ctx.fillText(displayText, canvas.width / 2, 130);
  
  // 시간 표시
  const now = new Date();
  const timeString = now.toLocaleString('ko-KR');
  ctx.fillStyle = '#717182';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText(timeString, canvas.width / 2, 160);
  
  return canvas.toDataURL();
};

// 텍스트 기반 식재료 인식 함수
const recognizeIngredientsFromText = async (text: string): Promise<MultipleIngredientsData> => {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ text })
  });

  const result = await response.json();
  
  if (!result.success) {
    if (result.error.includes('API 키')) {
      throw new Error(`${result.error}\n\n해결 방법:\n1. OpenAI 계정에서 유효한 API 키를 발급받으세요\n2. 환경 변수에 올바른 키를 설정해주세요`);
    }
    throw new Error(result.error || '텍스트 식재료 인식에 실패했습니다');
  }

  // 경고 메시지가 있는 경우 처리
  if (result.warning) {
    console.warn('AI 응답 경고:', result.warning);
    result.data._warning = result.warning;
  }

  return result.data;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ingredientData, setIngredientData] = useState<MultipleIngredientsData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFridge, setShowFridge] = useState(false);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [fridgeIngredients, setFridgeIngredients] = useState<FridgeIngredient[]>([]);

  // 페이지 로드 시 최근 기록과 냉장고 데이터 불러오기
  useEffect(() => {
    loadRecentRecords();
    loadFridgeIngredients();
  }, []);

  const loadRecentRecords = async () => {
    try {
      const records = await getRecentRecords(5);
      setRecentRecords(records);
    } catch (error) {
      console.error('최근 기록 로드 중 오류:', error);
    }
  };

  const loadFridgeIngredients = async () => {
    try {
      const ingredients = await getFridgeIngredients();
      setFridgeIngredients(ingredients);
    } catch (error) {
      console.error('냉장고 데이터 로드 중 오류:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    // 이미지 형식 기본 검증
    const fileType = file.type.toLowerCase();
    
    console.log('File type detected:', fileType);
    
    // 이미지 파일인지만 확인 (세부 형식은 서버에서 처리)
    if (!fileType.startsWith('image/')) {
      toast.error("이미지 파일이 아닙니다", {
        description: "이미지 파일을 선택해주세요.",
        duration: 4000
      });
      return;
    }

    // 이미지 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("이미지 파일이 너무 큽니다", {
        description: "10MB 이하의 이미지를 업로드해주세요.",
        duration: 4000
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      
      // AI 인식 수행
      const result = await recognizeIngredient(file);
      setIngredientData(result);
      
      // 경고 메시지가 있는 경우 사용자에게 알림
      if (result._warning) {
        toast.warning("인식 완료 (주의)", {
          description: result._warning,
          duration: 5000
        });
      }
      
      // 인식은 성공했지만 신뢰도가 낮은 경우
      const avgConfidence = result.ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / result.ingredients.length;
      if (avgConfidence < 70) {
        toast.warning("부분적 인식 성공", {
          description: "이미지 처리 중 문제가 발생했습니다. 더 명확한 이미지로 다시 시도해보세요.",
          duration: 5000
        });
      }
      
      // 데이터베이스에 저장을 위한 이미지 변환
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const imageData = await imageDataPromise;
      await saveIngredientRecord(imageData, result);
      console.log('식재료 인식 결과가 데이터베이스에 저장되었습니다');
      
      // 성공 알림 (다중 식재료 정보 포함)
      if (result._warning && result._warning.includes('영수증')) {
        // 영수증에서 추출된 경우
        const ingredientNames = result.ingredients.map(ing => `${ing.name} ${ing.quantity}개`).join(', ');
        toast.success(`📋 영수증에서 ${result.ingredients.length}가지 식재료 인식!`, {
          description: ingredientNames,
          duration: 6000
        });
      } else if (result.ingredients.length === 1) {
        const ingredient = result.ingredients[0];
        toast.success(`${ingredient.name} ${ingredient.quantity}개 인식 완료! (신뢰도: ${ingredient.confidence}%)`);
      } else {
        const ingredientNames = result.ingredients.map(ing => `${ing.name} ${ing.quantity}개`).join(', ');
        toast.success(`${result.ingredients.length}가지 식재료 인식 완료!`, {
          description: ingredientNames,
          duration: 6000
        });
      }
      
      // 최근 기록 새로고침
      await loadRecentRecords();
      
      // 냉장고에 식재료 자동 추가
      try {
        await addToFridge(result.ingredients);
        await loadFridgeIngredients();
        console.log('식재료가 냉장고에 자동 추가되었습니다');
      } catch (fridgeError) {
        console.error('냉장고 추가 중 오류:', fridgeError);
        // 냉장고 추가 실패해도 인식은 성공했으므로 경고만 표시
        toast.warning("냉장고 추가 실패", {
          description: "식재료 인식은 완료되었지만 냉장고에 추가되지 않았습니다.",
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error('식재료 인식 중 오류 발생:', error);
      
      // API 키 관련 에러인 경우 더 자세한 안내
      if (error.message.includes('API 키') || error.message.includes('401')) {
        toast.error("OpenAI API 키 설정이 필요합니다", {
          description: "유효한 OpenAI API ��를 환경 변수에 설정해주세요.",
          duration: 5000
        });
      } else if (error.message.includes('인식할 수 없습니다')) {
        toast.error("인식 실패", {
          description: "다른 각도에서 촬영하거나 조명이 밝은 곳에서 다시 시도해보세요.",
          duration: 5000
        });
      } else if (error.message.includes('이미지 형식') || error.message.includes('지원하지 않는')) {
        toast.error("이미지 형식 오류", {
          description: "PNG, JPEG, GIF, WebP 형식의 이미지만 지원됩니다.",
          duration: 4000
        });
      } else if (error.message.includes('이미지를 처리할 수 없습니다')) {
        toast.error("이미지 처리 오류", {
          description: "이미지 파일이 손상되었거나 너무 클 수 있습니다. 다른 이미지를 시도해주세요.",
          duration: 4000
        });
      } else {
        toast.error(`식재료 인식 실패: ${error.message}`, {
          duration: 4000
        });
      }
      
      // 실패 시 이미지 초기화
      setUploadedImage(null);
      setIngredientData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextInput = async (text: string) => {
    setIsLoading(true);
    
    try {
      // 텍스트 기반 AI 인식 수행
      const result = await recognizeIngredientsFromText(text);
      
      // 텍스트 입력을 위한 플레이스홀더 이미지 생성
      const placeholderImage = generateTextPlaceholderImage(text);
      setUploadedImage(placeholderImage);
      setIngredientData(result);
      
      // 경고 메시지가 있는 경우 사용자에게 알림
      if (result._warning) {
        toast.warning("인식 완료 (주의)", {
          description: result._warning,
          duration: 5000
        });
      }
      
      // 텍스트 입력도 데이터베이스에 저장
      try {
        await saveIngredientRecord(placeholderImage, result);
        console.log('텍스트 식재료 인식 결과가 데이터베이스에 저장되었습니다');
        
        // 최근 기록 새로고침
        await loadRecentRecords();
        
        // 냉장고에 식재료 자동 추가
        try {
          await addToFridge(result.ingredients);
          await loadFridgeIngredients();
          console.log('텍스트 인식 식재료가 냉장고에 자동 추가되었습니다');
        } catch (fridgeError) {
          console.error('냉장고 추가 중 오류:', fridgeError);
          toast.warning("냉장고 추가 실패", {
            description: "식재료 인식은 완료되었지만 냉장고에 추가되지 않았습니다.",
            duration: 3000
          });
        }
      } catch (saveError) {
        console.error('텍스트 인식 결과 저장 중 ��류:', saveError);
        // 저장 실패해도 인식은 성공했으므로 경고만 표시
        toast.warning("인식은 완료되었지만 기록 저장에 실패했습니다", {
          description: "결과는 확인할 수 있지만 기록에 저장되지 않았습니다.",
          duration: 4000
        });
      }
      
      // 성공 알림
      if (result.ingredients.length === 1) {
        const ingredient = result.ingredients[0];
        toast.success(`📝 ${ingredient.name} ${ingredient.quantity}개 인식 완료!`);
      } else {
        const ingredientNames = result.ingredients.map(ing => `${ing.name} ${ing.quantity}개`).join(', ');
        toast.success(`📝 ${result.ingredients.length}가지 식재료 인식 완료!`, {
          description: ingredientNames,
          duration: 6000
        });
      }
      
    } catch (error) {
      console.error('텍스트 식재료 인식 중 오류 발생:', error);
      
      if (error.message.includes('API 키') || error.message.includes('401')) {
        toast.error("OpenAI API 키 설정이 필요합니다", {
          description: "유효한 OpenAI API 키를 환경 변수에 설정해주세요.",
          duration: 5000
        });
      } else if (error.message.includes('식재료를 찾을 수 없습니다')) {
        toast.error("식재료 인식 실패", {
          description: "더 구체적으로 식재료 이름과 개수를 입력해주세요. 예: 사과 3개, 바나나 2개",
          duration: 5000
        });
      } else {
        toast.error(`텍스트 인식 실패: ${error.message}`, {
          duration: 4000
        });
      }
      
      // 실패 시 상태 초기화
      setUploadedImage(null);
      setIngredientData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setIngredientData(null);
  };

  const handleGoHome = () => {
    setUploadedImage(null);
    setIngredientData(null);
    setShowHistory(false);
    setShowFridge(false);
  };

  const handleIngredientDelete = (indexToDelete: number) => {
    if (!ingredientData) return;
    
    const updatedIngredients = ingredientData.ingredients.filter((_, index) => index !== indexToDelete);
    
    // 모든 식재료가 삭제된 경우
    if (updatedIngredients.length === 0) {
      handleReset();
      toast.success("모든 식재료가 삭제되었습니다");
      return;
    }
    
    // 남은 식재료로 데이터 업데이트
    const updatedData: MultipleIngredientsData = {
      ingredients: updatedIngredients,
      totalCount: updatedIngredients.reduce((sum, ing) => sum + ing.quantity, 0),
      _warning: ingredientData._warning
    };
    
    setIngredientData(updatedData);
    
    const deletedIngredient = ingredientData.ingredients[indexToDelete];
    toast.success(`${deletedIngredient.name} ${deletedIngredient.quantity}개가 삭제되었습니다`);
  };

  const handleIngredientUpdate = (index: number, name: string, quantity: number) => {
    if (!ingredientData) return;
    
    const updatedIngredients = [...ingredientData.ingredients];
    const oldIngredient = updatedIngredients[index];
    
    updatedIngredients[index] = {
      ...oldIngredient,
      name,
      quantity
    };
    
    const updatedData: MultipleIngredientsData = {
      ingredients: updatedIngredients,
      totalCount: updatedIngredients.reduce((sum, ing) => sum + ing.quantity, 0),
      _warning: ingredientData._warning
    };
    
    setIngredientData(updatedData);
    
    if (oldIngredient.name !== name && oldIngredient.quantity !== quantity) {
      toast.success(`${oldIngredient.name}을(를) ${name} ${quantity}개로 수정했습니다`);
    } else if (oldIngredient.name !== name) {
      toast.success(`식재료 이름을 ${name}으로 수정했습니다`);
    } else if (oldIngredient.quantity !== quantity) {
      toast.success(`${name} 개수를 ${quantity}개로 수정했습니다`);
    }
  };

  const handleIngredientAdd = async (name: string, quantity: number) => {
    if (!ingredientData) return;
    
    // 로딩 상태를 위한 임시 식재료 추가
    const tempIngredient: IngredientData = {
      name,
      quantity,
      confidence: 90,
      freshness: 'good',
      storage: ['정보를 불러오는 중...'],
      recipes: ['정보를 불러오는 중...'],
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        vitamin: '로딩 중...'
      },
      tips: ['정보를 불러오는 중...']
    };
    
    const tempUpdatedIngredients = [...ingredientData.ingredients, tempIngredient];
    const tempUpdatedData: MultipleIngredientsData = {
      ingredients: tempUpdatedIngredients,
      totalCount: tempUpdatedIngredients.reduce((sum, ing) => sum + ing.quantity, 0),
      _warning: ingredientData._warning
    };
    
    setIngredientData(tempUpdatedData);
    toast.success(`${name} ${quantity}개를 추가하고 정보를 생성하는 중...`);
    
    try {
      // AI로부터 실제 식재료 정보 생성
      const newIngredient = await generateIngredientInfo(name, quantity);
      
      // 실제 정보로 업데이트
      const finalUpdatedIngredients = [...ingredientData.ingredients, newIngredient];
      const finalUpdatedData: MultipleIngredientsData = {
        ingredients: finalUpdatedIngredients,
        totalCount: finalUpdatedIngredients.reduce((sum, ing) => sum + ing.quantity, 0),
        _warning: ingredientData._warning
      };
      
      setIngredientData(finalUpdatedData);
      toast.success(`${name} ${quantity}개가 추가되었습니다! (AI 정보 생성 완료)`);
      
    } catch (error) {
      console.error('식재료 정보 생성 중 오류:', error);
      
      // 에러 발생 시 기본 정보로 대체
      const fallbackIngredient: IngredientData = {
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
      
      const fallbackUpdatedIngredients = [...ingredientData.ingredients, fallbackIngredient];
      const fallbackUpdatedData: MultipleIngredientsData = {
        ingredients: fallbackUpdatedIngredients,
        totalCount: fallbackUpdatedIngredients.reduce((sum, ing) => sum + ing.quantity, 0),
        _warning: ingredientData._warning
      };
      
      setIngredientData(fallbackUpdatedData);
      toast.warning(`${name} ${quantity}개가 추가되었습니다 (기본 정보 제공)`, {
        description: `AI 정보 생성 중 오류가 발생했습니다: ${error.message}`
      });
    }
  };

  const handleHistorySelect = (record: any) => {
    setUploadedImage(record.imageData);
    
    // 레거시 데이터를 새 형식으로 변환
    if (record.ingredientData && !record.ingredientData.ingredients) {
      // 단일 식재료 레거시 데이터를 다중 식재료 형식으로 변환
      const convertedData: MultipleIngredientsData = {
        ingredients: [record.ingredientData],
        totalCount: record.ingredientData.quantity,
        _warning: record.ingredientData._warning
      };
      setIngredientData(convertedData);
    } else {
      setIngredientData(record.ingredientData);
    }
    
    setShowHistory(false);
    setShowFridge(false);
  };

  const handleFridgeIngredientUpdate = async (id: string, updates: Partial<FridgeIngredient>) => {
    try {
      await updateFridgeIngredient(id, updates);
      await loadFridgeIngredients();
    } catch (error) {
      console.error('냉장고 식재료 수정 중 오류:', error);
      toast.error(`수정 실패: ${error.message}`);
    }
  };

  const handleFridgeIngredientDelete = async (id: string) => {
    try {
      await deleteFridgeIngredient(id);
      await loadFridgeIngredients();
      toast.success("식재료가 냉장고에서 제거되었습니다");
    } catch (error) {
      console.error('냉장고 식재료 삭제 중 오류:', error);
      toast.error(`삭제 실패: ${error.message}`);
    }
  };

  const handleRecordDelete = async (recordId: string) => {
    try {
      await deleteRecord(recordId);
      
      // 기록 목록에서 삭제된 항목 제거
      setRecentRecords(prevRecords => prevRecords.filter(record => record.id !== recordId));
      
      toast.success("기록이 삭제되었습니다");
    } catch (error) {
      console.error('기록 삭제 중 오류:', error);
      toast.error(`삭제 실패: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg shadow-sm">
                <img 
                  src={fridgeAppIcon} 
                  alt="너만의 냉장고" 
                  className="w-12 h-12"
                />
              </div>
              <div>
                <h1>너만의 냉장고</h1>
                <p className="text-muted-foreground">스마트한 식재료 관리와 딱 맞는 레시피 추천</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 첫 화면이 아닐 때만 홈 버튼 표시 */}
              {(showHistory || showFridge || uploadedImage || ingredientData) && (
                <button
                  onClick={handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  처음으로
                </button>
              )}
              <button
                onClick={() => {
                  setShowFridge(!showFridge);
                  setShowHistory(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showFridge 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <Refrigerator className="w-4 h-4" />
                냉장고
                {fridgeIngredients.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-primary/20 text-xs rounded-full">
                    {fridgeIngredients.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowFridge(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showHistory 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <History className="w-4 h-4" />
                기록 보기
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {showFridge ? (
          <Fridge 
            ingredients={fridgeIngredients}
            onIngredientUpdate={handleFridgeIngredientUpdate}
            onIngredientDelete={handleFridgeIngredientDelete}
          />
        ) : showHistory ? (
          <IngredientHistory 
            records={recentRecords}
            onRecordSelect={handleHistorySelect}
            onRecordDelete={handleRecordDelete}
            onClose={() => setShowHistory(false)}
          />
        ) : !uploadedImage || !ingredientData ? (
          <div className="max-w-2xl mx-auto">
            {/* 레시피 추천 섹션 */}
            <div className="mb-8">
              <RecipeRecommendations fridgeIngredients={fridgeIngredients} />
            </div>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
                <ChefHat className="w-8 h-8 text-primary" />
              </div>
              <h2>식재료를 업로드해주세요</h2>
              <p className="text-muted-foreground">
                식재료 사진이나 영수증을 업로드하면 AI가 자동으로 인식하여 신선도, 보관법, 요리법을 알려드립니다
              </p>
            </div>
            
            <ImageUploader 
              onImageUpload={handleImageUpload}
              onTextInput={handleTextInput}
              isLoading={isLoading}
            />
            
            {/* AI 처리 상태 표시 */}
            {isLoading && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <div>
                    <p>🤖 AI가 식재료를 분석중입니다...</p>
                    <p className="text-sm text-muted-foreground">
                      이미지 인식 → 식재료 판별 → 정보 생성 → 데이터베이스 저장
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 너만의 냉장고 섹션 */}
            {fridgeIngredients.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Refrigerator className="w-5 h-5 text-primary" />
                    <h3>너만의 냉장고</h3>
                  </div>
                  <button
                    onClick={() => setShowFridge(true)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    전체보기 →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fridgeIngredients.slice(0, 4).map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="p-3 bg-card border rounded-lg"
                    >
                      <p className="text-sm">{ingredient.name}</p>
                      <p className="text-xs text-primary">{ingredient.quantity}개</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ingredient.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                {fridgeIngredients.length > 4 && (
                  <div className="text-center mt-3">
                    <p className="text-sm text-muted-foreground">
                      +{fridgeIngredients.length - 4}가지 더
                    </p>
                  </div>
                )}
              </div>
            )}

            {recentRecords.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4">최근 인식 기록</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {recentRecords.slice(0, 3).map((record, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistorySelect(record)}
                      className="p-3 bg-card border rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <img 
                        src={record.imageData} 
                        alt={record.ingredientData.name}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                      <p className="text-sm">
                        {record.ingredientData.ingredients ? (
                          record.ingredientData.ingredients.length === 1 
                            ? `${record.ingredientData.ingredients[0].name} ${record.ingredientData.ingredients[0].quantity}개`
                            : `${record.ingredientData.ingredients.length}가지 식재료 (총 ${record.ingredientData.totalCount}개)`
                        ) : (
                          // 레거시 데이터 지원
                          <span>
                            {record.ingredientData.name}
                            <span className="text-primary ml-1">
                              {record.ingredientData.quantity}개
                            </span>
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <IngredientResult
            image={uploadedImage}
            data={ingredientData}
            onReset={handleReset}
            onIngredientDelete={handleIngredientDelete}
            onIngredientUpdate={handleIngredientUpdate}
            onIngredientAdd={handleIngredientAdd}
          />
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>AI 기술로 더 스마트한 요리 생활을 시작하세요</p>
        </div>
      </footer>
      
      {/* Toast 알림 */}
      <Toaster />
    </div>
  );
}