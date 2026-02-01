import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { playerInventory } from '@/src/db/schema';
import { and, eq, sql } from 'drizzle-orm';

const RECIPES = {
  go_bowl_1: {
    name: '竹编棋罐',
    inputs: [{ itemId: 'bamboo', quantity: 5 }],
    outputs: [{ itemId: 'go_bowl_1', quantity: 1 }],
  },
  go_bowl_2: {
    name: '青竹棋罐',
    inputs: [{ itemId: 'go_bowl_1', quantity: 5 }],
    outputs: [{ itemId: 'go_bowl_2', quantity: 1 }],
  },
  go_bowl_3: {
    name: '云纹棋罐',
    inputs: [{ itemId: 'go_bowl_2', quantity: 5 }],
    outputs: [{ itemId: 'go_bowl_3', quantity: 1 }],
  },
  go_bowl_4: {
    name: '玄玉棋罐',
    inputs: [{ itemId: 'go_bowl_3', quantity: 5 }],
    outputs: [{ itemId: 'go_bowl_4', quantity: 1 }],
  },
  go_bowl_5: {
    name: '天工棋罐',
    inputs: [{ itemId: 'go_bowl_4', quantity: 5 }],
    outputs: [{ itemId: 'go_bowl_5', quantity: 1 }],
  },
  go_board_1: {
    name: '松木棋盘',
    inputs: [{ itemId: 'wood', quantity: 5 }],
    outputs: [{ itemId: 'go_board_1', quantity: 1 }],
  },
  go_board_2: {
    name: '竹纹棋盘',
    inputs: [{ itemId: 'go_board_1', quantity: 5 }],
    outputs: [{ itemId: 'go_board_2', quantity: 1 }],
  },
  go_board_3: {
    name: '云纹棋盘',
    inputs: [{ itemId: 'go_board_2', quantity: 5 }],
    outputs: [{ itemId: 'go_board_3', quantity: 1 }],
  },
  go_board_4: {
    name: '金丝棋盘',
    inputs: [{ itemId: 'go_board_3', quantity: 5 }],
    outputs: [{ itemId: 'go_board_4', quantity: 1 }],
  },
  go_board_5: {
    name: '天元棋盘',
    inputs: [{ itemId: 'go_board_4', quantity: 5 }],
    outputs: [{ itemId: 'go_board_5', quantity: 1 }],
  },
  go_stones: {
    name: '棋子',
    inputs: [{ itemId: 'stone', quantity: 20 }],
    outputs: [
      { itemId: 'black_go_stone', quantity: 10 },
      { itemId: 'white_go_stone', quantity: 10 },
    ],
  },
  herb_stamina_small: {
    name: '小体力丸',
    inputs: [{ itemId: 'herb', quantity: 3 }],
    outputs: [{ itemId: 'small_stamina_pill', quantity: 1 }],
  },
  herb_qi_small: {
    name: '小内力丸',
    inputs: [{ itemId: 'herb', quantity: 4 }],
    outputs: [{ itemId: 'small_qi_pill', quantity: 1 }],
  },
  herb_stamina_medium: {
    name: '中体力丸',
    inputs: [{ itemId: 'herb', quantity: 6 }],
    outputs: [{ itemId: 'medium_stamina_pill', quantity: 1 }],
  },
  herb_stamina_large: {
    name: '大体力丸',
    inputs: [{ itemId: 'herb', quantity: 8 }],
    outputs: [{ itemId: 'large_stamina_pill', quantity: 1 }],
  },
  herb_qi_large: {
    name: '大内力丸',
    inputs: [{ itemId: 'herb', quantity: 8 }],
    outputs: [{ itemId: 'large_qi_pill', quantity: 1 }],
  },
} as const;

type RecipeId = keyof typeof RECIPES;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const recipeId = String(body?.recipeId || '') as RecipeId;
    const recipe = RECIPES[recipeId];
    if (!recipe) {
      return NextResponse.json({ error: '无效的配方' }, { status: 400 });
    }

    const userId = session.user.id;

    const inventory = await db
      .select({ id: playerInventory.id, itemId: playerInventory.itemId, quantity: playerInventory.quantity })
      .from(playerInventory)
      .where(eq(playerInventory.userId, userId));

    const inventoryMap = new Map(inventory.map((entry) => [entry.itemId, entry]));

    for (const input of recipe.inputs) {
      const entry = inventoryMap.get(input.itemId);
      if (!entry || entry.quantity < input.quantity) {
        return NextResponse.json({
          error: `材料不足：${input.itemId}`,
        }, { status: 400 });
      }
    }

    await db.transaction(async (tx) => {
      for (const input of recipe.inputs) {
        const entry = inventoryMap.get(input.itemId)!;
        const nextQuantity = entry.quantity - input.quantity;
        if (nextQuantity <= 0) {
          await tx
            .delete(playerInventory)
            .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, input.itemId)));
        } else {
          await tx
            .update(playerInventory)
            .set({ quantity: nextQuantity, updatedAt: new Date() })
            .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, input.itemId)));
        }
      }

      for (const output of recipe.outputs) {
        const existing = await tx
          .select({ id: playerInventory.id })
          .from(playerInventory)
          .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, output.itemId)))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(playerInventory)
            .set({
              quantity: sql`${playerInventory.quantity} + ${output.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(playerInventory.id, existing[0].id));
        } else {
          await tx.insert(playerInventory).values({
            userId,
            itemId: output.itemId,
            quantity: output.quantity,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `制作成功：${recipe.name}`,
      outputs: recipe.outputs,
    });
  } catch (error) {
    console.error('工坊制作失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
