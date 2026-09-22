import "dotenv/config";
import { getDefaultUser, prisma } from "../src/server/db";

type ConceptSeed = {
  name: string;
  slug: string;
  description: string;
  difficulty: number;
};

async function upsertSubject(name: string, slug: string) {
  return prisma.subject.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertTopic(
  subjectId: string,
  name: string,
  slug: string,
  sortOrder: number,
) {
  return prisma.topic.upsert({
    where: {
      subjectId_slug: {
        subjectId,
        slug,
      },
    },
    update: { name, sortOrder },
    create: {
      subjectId,
      name,
      slug,
      sortOrder,
    },
  });
}

async function upsertConcept(topicId: string, seed: ConceptSeed) {
  return prisma.concept.upsert({
    where: {
      topicId_slug: {
        topicId,
        slug: seed.slug,
      },
    },
    update: {
      name: seed.name,
      description: seed.description,
      difficulty: seed.difficulty,
    },
    create: {
      topicId,
      ...seed,
    },
  });
}

async function prerequisite(fromConceptId: string, toConceptId: string) {
  return prisma.conceptRelation.upsert({
    where: {
      fromConceptId_toConceptId_relationType: {
        fromConceptId,
        toConceptId,
        relationType: "PREREQUISITE",
      },
    },
    update: { strength: 1 },
    create: {
      fromConceptId,
      toConceptId,
      relationType: "PREREQUISITE",
      strength: 1,
    },
  });
}

async function main() {
  const user = await getDefaultUser();

  const micro = await upsertSubject("微观经济学 Microeconomics", "microeconomics");
  const uncertainty = await upsertTopic(
    micro.id,
    "不确定性 Uncertainty",
    "uncertainty",
    10,
  );
  const consumer = await upsertTopic(
    micro.id,
    "消费者理论 Consumer Theory",
    "consumer-theory",
    20,
  );

  const expectedUtility = await upsertConcept(uncertainty.id, {
    name: "期望效用 Expected Utility",
    slug: "expected-utility",
    description: "Distinguish E[u(X)] from u(E[X]) and use expected utility to evaluate risky prospects.",
    difficulty: 2,
  });
  const riskAversion = await upsertConcept(uncertainty.id, {
    name: "风险厌恶 Risk Aversion",
    slug: "risk-aversion",
    description: "Connect concavity of utility with preferences over risky wealth.",
    difficulty: 2,
  });
  const certaintyEquivalent = await upsertConcept(uncertainty.id, {
    name: "确定性等价 Certainty Equivalent",
    slug: "certainty-equivalent",
    description: "The certain wealth level that gives the same utility as a risky prospect.",
    difficulty: 3,
  });
  const riskPremium = await upsertConcept(uncertainty.id, {
    name: "风险溢价 Risk Premium",
    slug: "risk-premium",
    description: "The difference between expected wealth and the certainty equivalent for a risk-averse learner.",
    difficulty: 3,
  });
  const jensen = await upsertConcept(uncertainty.id, {
    name: "Jensen 不等式 Jensen's Inequality",
    slug: "jensen-inequality",
    description: "Use concavity or convexity to compare E[u(X)] and u(E[X]).",
    difficulty: 3,
  });

  const indirectUtility = await upsertConcept(consumer.id, {
    name: "间接效用函数 Indirect Utility",
    slug: "indirect-utility",
    description: "Maximum utility as a function of prices and income.",
    difficulty: 3,
  });
  const expenditure = await upsertConcept(consumer.id, {
    name: "支出函数 Expenditure Function",
    slug: "expenditure-function",
    description: "Minimum expenditure required to attain a utility target at given prices.",
    difficulty: 3,
  });
  const hicksian = await upsertConcept(consumer.id, {
    name: "希克斯需求 Hicksian Demand",
    slug: "hicksian-demand",
    description: "Compensated demand obtained from expenditure minimization.",
    difficulty: 4,
  });
  const slutsky = await upsertConcept(consumer.id, {
    name: "斯勒茨基方程 Slutsky Equation",
    slug: "slutsky-equation",
    description: "Decompose a price effect into substitution and income effects.",
    difficulty: 4,
  });

  await prerequisite(expectedUtility.id, riskAversion.id);
  await prerequisite(riskAversion.id, certaintyEquivalent.id);
  await prerequisite(certaintyEquivalent.id, riskPremium.id);
  await prerequisite(jensen.id, riskAversion.id);
  await prerequisite(indirectUtility.id, expenditure.id);
  await prerequisite(expenditure.id, hicksian.id);
  await prerequisite(hicksian.id, slutsky.id);

  const math = await upsertSubject("线性代数 Linear Algebra", "linear-algebra");
  const linearSystems = await upsertTopic(
    math.id,
    "向量、秩与方程组",
    "vectors-rank-systems",
    10,
  );

  const independence = await upsertConcept(linearSystems.id, {
    name: "线性相关与线性无关 Linear Independence",
    slug: "linear-independence",
    description: "Determine when vectors contain redundant directions.",
    difficulty: 2,
  });
  const columnSpace = await upsertConcept(linearSystems.id, {
    name: "列空间 Column Space",
    slug: "column-space",
    description: "Understand the span of matrix columns and its connection to linear maps.",
    difficulty: 3,
  });
  const rank = await upsertConcept(linearSystems.id, {
    name: "矩阵的秩 Matrix Rank",
    slug: "matrix-rank",
    description: "Connect row rank, column rank, pivots, and the dimension of image spaces.",
    difficulty: 3,
  });
  const systems = await upsertConcept(linearSystems.id, {
    name: "线性方程组解结构 Linear Systems",
    slug: "linear-systems",
    description: "Use rank and null space to analyze existence and multiplicity of solutions.",
    difficulty: 3,
  });

  await prerequisite(independence.id, rank.id);
  await prerequisite(columnSpace.id, rank.id);
  await prerequisite(rank.id, systems.id);

  const initialStates = [
    [expectedUtility.id, 0.68, 0.58],
    [riskAversion.id, 0.61, 0.55],
    [certaintyEquivalent.id, 0.42, 0.41],
    [riskPremium.id, 0.36, 0.35],
    [jensen.id, 0.46, 0.40],
    [indirectUtility.id, 0.56, 0.51],
    [expenditure.id, 0.44, 0.43],
    [rank.id, 0.52, 0.47],
  ] as const;

  for (const [conceptId, mastery, confidence] of initialStates) {
    await prisma.learningState.upsert({
      where: {
        userId_conceptId: {
          userId: user.id,
          conceptId,
        },
      },
      update: {
        mastery,
        confidence,
      },
      create: {
        userId: user.id,
        conceptId,
        mastery,
        confidence,
      },
    });
  }

  const dueConcepts = [certaintyEquivalent.id, rank.id];
  for (const conceptId of dueConcepts) {
    const existing = await prisma.reviewTask.findFirst({
      where: {
        userId: user.id,
        conceptId,
        status: "PENDING",
      },
    });

    if (!existing) {
      await prisma.reviewTask.create({
        data: {
          userId: user.id,
          conceptId,
          scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
          intervalDays: 1,
          priority: 80,
          source: "LOW_MASTERY",
        },
      });
    }
  }

  console.log("StudyOS seed complete.");
  console.log(`Seed user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
