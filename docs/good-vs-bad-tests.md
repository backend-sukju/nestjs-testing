# 좋은 테스트 vs 나쁜 테스트 — 실행 가능한 예시

> 나쁜 테스트: "코드가 **이렇게 생겼다**"를 확인 → 구현을 바꾸면 깨진다
> 좋은 테스트: "코드가 **이렇게 동작한다**"를 확인 → 동작이 그대로면 구현을 바꿔도 안 깨진다

이 저장소의 `src/order/` 에 할인 계산 도메인을 하나 두고, **같은 코드에 대해 세 종류의 테스트**를 붙여 차이를 눈으로 보게 했습니다.

## 도메인

- `DiscountPolicy` — 등급별 할인율. **VIP 20%, GOLD 10%, 일반 0%** (사람이 정한 비즈니스 규칙)
- `PriceCalculator` — 금액에 할인율 적용
- `AuditLogger` — 로깅 (결과에 영향 없는 부수효과)
- `PaymentGateway` / `NotificationService` — 결제와 실패 알림 (부수효과)
- `OrderService.calculateFinalPrice()` — 위 협력자를 엮어 최종가를 계산
- `OrderService.checkout()` — 결제 실패 시 알림 이메일 발송

## 세 개의 테스트 파일

| 파일 | 성격 | 무엇을 검증하나 |
|---|---|---|
| `order.service.change-detector.spec.ts` | ❌ 나쁨 | 내부 호출(`getRate`, `applyDiscount`, `log`)이 **불렸는지**만 |
| `order.service.behavior.spec.ts` | ✅ 좋음 | **결과**(VIP 10000원 → 8000원)라는 사람이 정한 규칙 |
| `order.service.side-effect.spec.ts` | ⚪ 회색지대 | 결과로 검증 가능하면 결과로, 이메일 발송처럼 안 되면 `verify` |

### ❌ change-detector — 구조를 그대로 베낀 거울

```ts
service.calculateFinalPrice(vip, 10000);

expect(discountPolicy.getRate).toHaveBeenCalledWith(Grade.VIP);
expect(priceCalculator.applyDiscount).toHaveBeenCalledWith(10000, 0.2);
expect(logger.log).toHaveBeenCalled();
// ⚠️ "8000원이 나와야 한다"는 규칙 검증이 어디에도 없다
```

- 결과를 하나도 안 본다. `getRate`/`applyDiscount`/`log`가 "불렸다"만 확인.
- 프로덕션 코드의 세 줄을 `verify`로 그대로 따라 썼다 → 코드와 테스트가 똑같이 생겼다.
- 협력자를 canned 값으로 스텁했기 때문에 **진짜 규칙은 한 줄도 실행되지 않는다.**

### ✅ behavior — 동작을 검증

```ts
it.each([
  [Grade.VIP, 10000, 8000],   // VIP는 20% 할인
  [Grade.GOLD, 10000, 9000],  // GOLD는 10% 할인
  [Grade.NORMAL, 10000, 10000],
])('%s 등급은 %d원 주문 시 최종 %d원을 낸다', (grade, amount, expected) => {
  const finalPrice = service.calculateFinalPrice({ id: 1, name: '김철수', grade }, amount);
  expect(finalPrice).toBe(expected);
});
```

- `DiscountPolicy`와 `PriceCalculator`는 **진짜 구현을 주입**해 규칙 전체를 관통한다.
- 검증은 오직 결과(최종가). 내부 호출 순서/횟수는 신경 쓰지 않는다.
- `8000`은 코드 어디에도 "이래야 한다"고 명시돼 있지 않던, 테스트만이 못박는 지식이다.

### ⚪ side-effect — verify가 정당한 회색지대

```ts
// 결제 실패 시 이메일 발송은 결과 상태로 조회 불가 → verify가 유일한 방법
paymentGateway.charge.mockResolvedValue({ success: false });
await expect(service.checkout(vip, 10000)).rejects.toThrow(PaymentFailedError);
expect(notification.sendPaymentFailedEmail).toHaveBeenCalledWith(vip);

// 반면 결제 성공 시 "결제 금액"은 결과로 검증 가능 → verify 대신 반환값을 본다
const result = await service.checkout(vip, 10000);
expect(result).toEqual({ paid: 8000, transactionId: 'tx_1' });
```

기준: **결과 상태로 검증할 수 있으면 그걸 우선하고, 도저히 안 될 때만 상호작용을 검증한다.** `verify`를 "편해서"가 아니라 "그 방법밖에 없어서" 쓰는 거라면 괜찮다.

## 두 실험으로 직접 확인하기

이 저장소에서 실제로 돌려 검증한 결과입니다.

### 실험 1 — 구조를 바꾼다 (동작은 그대로)

`order.service.ts`에서 `this.logger.log(...)` 한 줄을 지운다. 할인 결과는 전혀 안 변한다.

```
❌ change-detector … 🔴 FAIL   ← 동작이 그대론데 구조가 바뀌었다고 실패
✅ behavior        … 🟢 PASS
⚪ side-effect     … 🟢 PASS
```

### 실험 2 — 규칙을 어긴다

`discount-policy.ts`에서 `[Grade.VIP]: 0.2` 를 `0.15`로 바꾼다. VIP가 8000원이 아니라 8500원을 내게 된다 — 명백한 결함.

```
❌ change-detector … 🟢 PASS   ← 결함을 그대로 통과시킨다
✅ behavior        … 🔴 FAIL   ← 즉시 잡아낸다
⚪ side-effect     … 🔴 FAIL   ← 즉시 잡아낸다
```

정리하면 나쁜 테스트는 정확히 **반대로** 동작한다 — 리팩터링에는 깨지고, 진짜 버그는 놓친다.

| | 구조 변경(리팩터링) | 규칙 위반(버그) |
|---|---|---|
| ❌ change-detector | 🔴 깨짐 (오탐) | 🟢 통과 (놓침) |
| ✅ behavior / ⚪ side-effect | 🟢 통과 | 🔴 잡아냄 |

## 스스로 물어볼 두 질문

1. **"동작은 그대로 두고 내부를 리팩터링하면 이 테스트가 깨지나?"**
   → 깨진다면 구조를 베낀 나쁜 테스트일 확률이 높다.
2. **"이 테스트를 지우면, 팀이 아는 규칙 중에 코드가 모르는 게 생기나?"**
   → 아니라면(코드에 이미 다 적혀 있다면) 지워도 되는 테스트다.

## 이 저장소 안의 실물 반면교사

`src/user/user.service.spec.ts` 는 전형적인 change-detector입니다.

```ts
const result = await service.create(userData);

expect(prismaService.user.create).toHaveBeenCalledWith({ data: userData });
expect(result).toEqual(expectedUser); // expectedUser도 결국 입력을 그대로 조립한 것
```

`user.service.ts`의 `return this.prisma.user.create({ data })` 를 테스트가 그대로 거울처럼 베꼈고, `mockResolvedValue`로 넣은 값을 그대로 돌려받아 확인합니다. Prisma 호출 형태(`include: { posts: true }` 등)를 바꾸면 동작이 같아도 테스트가 깨지고, 정작 규칙 검증은 없습니다.

## 실행

```bash
npm test -- src/order          # 세 스펙 모두 통과 (6 tests)
npm test -- order.service.behavior
```

## 부록 — 테스트 파일을 어디에 둘까 (콜로케이션 vs `test/` 분리)

이 예시는 스펙을 **소스 옆(`src/order/*.spec.ts`)에 두는 콜로케이션** 방식을 씁니다. NestJS/Jest의 공식 기본 관례입니다. `test/` 디렉토리로 분리하는 것도 가능하며, 두 방식의 트레이드오프는 다음과 같습니다.

| | 콜로케이션 (현재) | `test/` 분리 |
|---|---|---|
| import 경로 | 짧음 (`./order.service`) | 길어짐 (`../../src/order/order.service`) |
| Nest CLI `--spec` 생성 | 이 위치에 자동 생성 | 수동 관리 |
| 탐색 | 소스와 섞임 | 테스트만 한곳에 모임 |
| 관례 | Nest/Jest 기본 | Spring/Java 스타일 팀이 선호 |

현재 이 저장소의 Jest 설정은 이렇게 나뉘어 있습니다 (`package.json`의 `jest`, `test/jest-e2e.json`):

- **유닛(`npm test`)**: `rootDir: "src"` + `testRegex: ".*\\.spec\\.ts$"` → **`src/` 안의 `*.spec.ts`만** 실행
- **E2E(`npm run test:e2e`)**: `rootDir: "."` + `testRegex: ".e2e-spec.ts$"` → `test/`의 `*.e2e-spec.ts` 실행

### 주의 1 — 지금 `test/user.spec.ts`는 실행되지 않는 고아 파일

유닛 설정의 `rootDir`가 `src`라서, `test/` 아래 `*.spec.ts`는 `npm test`가 스캔하지 않습니다. `npx jest --listTests`로 확인 가능합니다.

### 주의 2 — 단순히 `rootDir`를 `.`로 바꾸면 안 되는 이유

`test/`를 유닛 런에 포함시키려고 `rootDir`만 `"."`로 바꾸면 두 가지가 딸려 옵니다.

1. `test/user.spec.ts`는 **실제 DB에 붙어 `deleteMany()`로 데이터를 지우는** 통합 테스트라, 순수 유닛 런에 섞이면 안 됩니다.
2. `.*\.spec\.ts$` 정규식이 `user.e2e-spec.ts`까지 매칭해 **E2E가 유닛 런에 섞입니다.**

그래서 분리 방식으로 가려면 `rootDir` 변경만으로는 부족하고, `roots`/`testMatch`로 대상을 좁히거나 Jest `projects`(멀티 프로젝트)로 유닛·통합·E2E를 명시적으로 갈라야 합니다. 이 예시는 복잡도를 줄이기 위해 콜로케이션을 유지했습니다.
