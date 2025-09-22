import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { ChefHat, Clock, Users, AlertCircle, CheckCircle, Star, Utensils } from 'lucide-react';
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface Recipe {
  name: string;
  difficulty: string;
  cookingTime: string;
  servings: string;
  description: string;
  availableIngredients: string[];
  missingIngredients: string[];
  category: string;
}

interface DetailedRecipe {
  name: string;
  description: string;
  difficulty: string;
  cookingTime: string;
  prepTime: string;
  servings: string;
  calories: string;
  ingredients: Array<{
    name: string;
    amount: string;
    essential: boolean;
  }>;
  instructions: Array<{
    step: number;
    title: string;
    description: string;
    tip?: string;
  }>;
  tips: string[];
  nutrition: {
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
  tags: string[];
}

interface RecipeRecommendationsProps {
  fridgeIngredients: FridgeIngredient[];
}

export function RecipeRecommendations({ fridgeIngredients }: RecipeRecommendationsProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<DetailedRecipe | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [userRequest, setUserRequest] = useState<string>('');
  const [recipeCache, setRecipeCache] = useState<Map<string, DetailedRecipe>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);

  // 레시피 추천 API 호출
  const getRecipeRecommendations = async (ingredients: FridgeIngredient[], userRequest?: string) => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/recipes/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ ingredients, userRequest })
    });
    
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get recipe recommendations');
    }
    
    // 경고 메시지가 있는 경우 처리
    if (result.warning) {
      toast.warning('레시피 생성 주의', {
        description: result.warning
      });
    }
    
    return result.data.recipes;
  };

  // 상세 레시피 API 호출
  const getDetailedRecipe = async (recipeName: string) => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1aa0d6ee/recipes/detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ 
        recipeName,
        ingredients: fridgeIngredients 
      })
    });
    
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get detailed recipe');
    }
    
    // 경고 메시지가 있는 경우 처리
    if (result.warning) {
      toast.warning('레시피 생성 주의', {
        description: result.warning
      });
    }
    
    return result.data.recipe;
  };

  // 백그라운드에서 상세 레시피 미리 로드
  const preloadRecipeDetails = async (recipeNames: string[]) => {
    if (recipeNames.length === 0) return;
    
    setIsPreloading(true);
    const newCache = new Map(recipeCache);
    
    // 병렬로 상세 레시피 요청
    const preloadPromises = recipeNames.slice(0, 3).map(async (recipeName) => {
      // 이미 캐시에 있으면 건너뛰기
      if (newCache.has(recipeName)) {
        return { recipeName, recipe: newCache.get(recipeName), success: true };
      }
      
      try {
        const detailedRecipe = await getDetailedRecipe(recipeName);
        newCache.set(recipeName, detailedRecipe);
        return { recipeName, recipe: detailedRecipe, success: true };
      } catch (error) {
        console.error(`상세 레시피 미리 로드 실패 (${recipeName}):`, error);
        return { recipeName, recipe: null, success: false };
      }
    });
    
    const results = await Promise.allSettled(preloadPromises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    setRecipeCache(newCache);
    setIsPreloading(false);
    
    if (successCount > 0) {
      console.log(`✅ ${successCount}개 레시피 상세정보를 미리 로드했습니다`);
    }
  };

  // 레시피 추천 로드
  const loadRecommendations = async (customRequest?: string) => {
    if (fridgeIngredients.length === 0) return;
    
    setIsLoading(true);
    // 캐시 초기화 (새로운 추천이므로)
    setRecipeCache(new Map());
    
    try {
      const requestText = customRequest !== undefined ? customRequest : (userRequest || '');
      const recommendedRecipes = await getRecipeRecommendations(fridgeIngredients, requestText);
      setRecipes(recommendedRecipes);
      
      // API 응답에 경고가 있는 경우 알림
      if (recommendedRecipes.length === 0) {
        toast.warning('추천 레시피를 찾을 수 없습니다', {
          description: '다른 식재료를 추가하거나 요청사항을 바꿔보세요'
        });
      } else {
        // 성공 메시지
        if (requestText && requestText.trim()) {
          toast.success(`"${requestText.trim()}" 요청에 맞는 레시피를 찾았습니다!`);
        } else {
          toast.success(`${recommendedRecipes.length}가지 레시피를 추천했습니다!`);
        }
      }
      
      // 추천 완료 후 백그라운드에서 상세 정보 미리 로드
      if (recommendedRecipes.length > 0) {
        const recipeNames = recommendedRecipes.slice(0, 3).map(r => r.name);
        setTimeout(() => preloadRecipeDetails(recipeNames), 100); // 약간의 딜레이 후 시작
      }
      
    } catch (error) {
      console.error('레시피 추천 로드 중 오류:', error);
      
      // 더 구체적인 에러 메시지 제공
      let errorMessage = '레시피 추천을 불러올 수 없습니다';
      let errorDescription = error.message;
      
      if (error.message.includes('API 키')) {
        errorMessage = 'OpenAI API 설정 오류';
        errorDescription = 'API 키를 확인해주세요';
      } else if (error.message.includes('냉장고에 식재료가 없습니다')) {
        errorMessage = '식재료 부족';
        errorDescription = '냉장고에 식재료를 추가해주세요';
      } else if (error.message.includes('파싱')) {
        errorMessage = 'AI 응답 처리 오류';
        errorDescription = '잠시 후 다시 시도해주세요';
      }
      
      toast.error(errorMessage, {
        description: errorDescription
      });
      
      // 에러 시 빈 배열로 설정
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 상세 레시피 보기
  const handleViewDetail = async (recipeName: string) => {
    setShowDetailDialog(true);
    
    // 캐시에서 먼저 확인
    const cachedRecipe = recipeCache.get(recipeName);
    if (cachedRecipe) {
      setSelectedRecipe(cachedRecipe);
      console.log(`🚀 캐시된 레시피 즉시 표시: ${recipeName}`);
      return;
    }
    
    // 캐시에 없으면 로딩하면서 가져오기
    setIsDetailLoading(true);
    try {
      const detailedRecipe = await getDetailedRecipe(recipeName);
      setSelectedRecipe(detailedRecipe);
      
      // 새로 가져온 레시피를 캐시에 저장
      setRecipeCache(prev => new Map(prev).set(recipeName, detailedRecipe));
      
    } catch (error) {
      console.error('상세 레시피 로드 중 오류:', error);
      toast.error('상세 레시피를 불러올 수 없습니다', {
        description: error.message
      });
      setShowDetailDialog(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '쉬움': return 'bg-green-500';
      case '보통': return 'bg-yellow-500';
      case '어려움': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '한식': return '🍚';
      case '양식': return '🍝';
      case '중식': return '🥢';
      case '일식': return '🍣';
      case '디저트': return '🍰';
      default: return '🍽️';
    }
  };

  // 냉장고 식재료가 변경될 때는 기존 레시피 초기화만 수행
  useEffect(() => {
    if (fridgeIngredients.length === 0) {
      setRecipes([]);
      setRecipeCache(new Map());
    }
  }, [fridgeIngredients.length]);

  // 냉장고가 비어있는 경우
  if (fridgeIngredients.length === 0) {
    return (
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 text-white rounded-lg">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3>추천 레시피</h3>
              <p className="text-muted-foreground text-sm">
                냉장고 식재료로 만들 수 있는 요리들
              </p>
            </div>
          </div>
          
          {/* 요청사항 입력 및 추천 버튼 (비활성화) */}
          <div className="flex gap-2">
            <Input
              placeholder="냉장고에 식재료를 추가한 후 요청사항을 입력하세요"
              className="flex-1"
              disabled
            />
            <Button
              variant="outline"
              disabled
            >
              추천
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">
              <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">냉장고에 식재료를 추가하면</p>
              <p className="text-xs">맞춤 레시피를 추천해드려요!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-orange-500 text-white rounded-lg">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h3>추천 레시피</h3>
            <p className="text-muted-foreground text-sm">
              냉장고 식재료로 만들 수 있는 요리들
            </p>
          </div>
        </div>
        
        {/* 요청사항 입력 및 추천 버튼 */}
        <div className="flex gap-2">
          <Input
            value={userRequest || ''}
            onChange={(e) => setUserRequest(e.target.value || '')}
            placeholder="원하는 요리나 조건을 입력하세요 (예: 매운 요리, 간단한 요리, 다이어트 식단)"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                loadRecommendations();
              }
            }}
          />
          <Button
            onClick={() => loadRecommendations()}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? '추천 중...' : '추천'}
          </Button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">🤖 AI가 맞춤 레시피를 찾고 있어요...</p>
            <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
          </CardContent>
        </Card>
      )}

      {/* 레시피 목록 - 초기 상태와 추천 실패 상태 구분 */}
      {!isLoading && recipes.length === 0 && fridgeIngredients.length > 0 && (
        <Card 
          className="hover:shadow-md transition-all cursor-pointer hover:scale-105"
          onClick={() => loadRecommendations()}
        >
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground hover:text-foreground transition-colors">
              <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50 hover:opacity-80 transition-opacity" />
              <p className="text-sm font-medium">레시피 자동 추천</p>
              <p className="text-xs">냉장고 식재료로 맞춤 레시피를 추천해드릴게요</p>
              <p className="text-xs text-primary mt-2">👆 클릭해서 시작하기</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && recipes.length > 0 && (
        <div className="space-y-4">
          {/* 백그라운드 로딩 상태 표시 */}
          {isPreloading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
              <div className="animate-spin w-3 h-3 border border-orange-500 border-t-transparent rounded-full" />
              <span>상세 레시피를 미리 준비하고 있어요...</span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            {recipes.slice(0, 3).map((recipe, index) => {
              const isCached = recipeCache.has(recipe.name);
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-md transition-all cursor-pointer hover:scale-105 relative"
                  onClick={() => handleViewDetail(recipe.name)}
                >
                  {/* 캐시 상태 표시 */}
                  {isCached && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" 
                         title="상세 레시피 준비 완료" />
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="text-center">
                      <div className="text-2xl mb-2">{getCategoryIcon(recipe.category)}</div>
                      <CardTitle className="text-base leading-tight">
                        {recipe.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {recipe.description}
                      </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* 요리 정보 */}
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Badge className={`text-white text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                        {recipe.difficulty}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {recipe.cookingTime}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3" />
                        {recipe.servings}
                      </Badge>
                    </div>

                    {/* 식재료 상태 */}
                    <div className="space-y-1">
                      {recipe.availableIngredients.length > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <p className="text-xs text-green-600 truncate">
                            보유 재료: {recipe.availableIngredients.slice(0, 2).join(', ')}
                            {recipe.availableIngredients.length > 2 && '...'}
                          </p>
                        </div>
                      )}
                      
                      {recipe.missingIngredients.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <p className="text-xs text-orange-600 truncate">
                            필요 재료: {recipe.missingIngredients.slice(0, 2).join(', ')}
                            {recipe.missingIngredients.length > 2 && '...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 상세 레시피 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              {selectedRecipe?.name || '레시피 상세정보'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {isDetailLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p>상세 레시피를 불러오는 중...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  다음번에는 더 빨라질 거예요! 🚀
                </p>
              </div>
            ) : selectedRecipe ? (
              <div className="space-y-6 p-1">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">난이도</p>
                    <p className="font-medium">{selectedRecipe.difficulty}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">조리시간</p>
                    <p className="font-medium">{selectedRecipe.cookingTime}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">인분</p>
                    <p className="font-medium">{selectedRecipe.servings}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">칼로리</p>
                    <p className="font-medium">{selectedRecipe.calories}</p>
                  </div>
                </div>

                {/* 설명 */}
                <div>
                  <h4 className="mb-2">요리 소개</h4>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>

                {/* 재료 */}
                <div>
                  <h4 className="mb-3">필요한 재료</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-card border rounded">
                        <span>{ingredient.name}</span>
                        <span className="text-sm text-muted-foreground">{ingredient.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 조리법 */}
                <div>
                  <h4 className="mb-3">조리 과정</h4>
                  <div className="space-y-4">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {instruction.step}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium mb-1">{instruction.title}</h5>
                          <p className="text-sm text-muted-foreground">{instruction.description}</p>
                          {instruction.tip && (
                            <p className="text-xs text-orange-600 mt-1 italic">💡 {instruction.tip}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 팁 */}
                {selectedRecipe.tips.length > 0 && (
                  <div>
                    <h4 className="mb-3">조리 팁</h4>
                    <ul className="space-y-2">
                      {selectedRecipe.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-orange-500 mt-1">💡</span>
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 영양 정보 */}
                <div>
                  <h4 className="mb-3">영양 정보 (1인분 기준)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">단백질</p>
                      <p className="font-medium">{selectedRecipe.nutrition.protein}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">탄수화물</p>
                      <p className="font-medium">{selectedRecipe.nutrition.carbs}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">지방</p>
                      <p className="font-medium">{selectedRecipe.nutrition.fat}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">식이섬유</p>
                      <p className="font-medium">{selectedRecipe.nutrition.fiber}</p>
                    </div>
                  </div>
                </div>

                {/* 태그 */}
                {selectedRecipe.tags.length > 0 && (
                  <div>
                    <h4 className="mb-3">태그</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}