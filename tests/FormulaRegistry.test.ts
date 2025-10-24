/** @format */

import { describe, it, expect, beforeEach } from "vitest";
import {
  stringUtf8CV,
  uintCV,
  buffCV,
  listCV,
  tupleCV,
  principalCV,
} from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_HASH = 101;
const ERR_INVALID_TITLE = 102;
const ERR_INVALID_DESCRIPTION = 103;
const ERR_INVALID_ROYALTY_RATE = 107;
const ERR_INVALID_CONTRIBUTOR_SHARE = 108;
const ERR_FORMULA_ALREADY_EXISTS = 105;
const ERR_FORMULA_NOT_FOUND = 106;
const ERR_INVALID_FORMULA_TYPE = 115;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_CURRENCY = 118;
const ERR_INVALID_VERSION = 119;
const ERR_INVALID_MIN_ROYALTY = 113;
const ERR_INVALID_MAX_ROYALTY = 114;
const ERR_MAX_FORMULAS_EXCEEDED = 120;
const ERR_INVALID_UPDATE_PARAM = 110;
const ERR_AUTHORITY_NOT_VERIFIED = 112;

interface Formula {
  hash: Uint8Array;
  title: string;
  description: string;
  timestamp: number;
  creator: string;
  royaltyRate: number;
  formulaType: string;
  status: boolean;
  location: string;
  currency: string;
  version: number;
  minRoyalty: number;
  maxRoyalty: number;
}

interface FormulaUpdate {
  updateTitle: string;
  updateDescription: string;
  updateRoyaltyRate: number;
  updateTimestamp: number;
  updater: string;
}

interface Contributor {
  contributor: string;
  share: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class FormulaRegistryMock {
  state: {
    nextFormulaId: number;
    maxFormulas: number;
    registrationFee: number;
    authorityContract: string | null;
    formulas: Map<number, Formula>;
    formulaUpdates: Map<number, FormulaUpdate>;
    formulasByHash: Map<string, number>;
    contributors: Map<number, Contributor[]>;
  } = {
    nextFormulaId: 0,
    maxFormulas: 10000,
    registrationFee: 500,
    authorityContract: null,
    formulas: new Map(),
    formulaUpdates: new Map(),
    formulasByHash: new Map(),
    contributors: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextFormulaId: 0,
      maxFormulas: 10000,
      registrationFee: 500,
      authorityContract: null,
      formulas: new Map(),
      formulaUpdates: new Map(),
      formulasByHash: new Map(),
      contributors: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  registerFormula(
    hash: Uint8Array,
    title: string,
    description: string,
    royaltyRate: number,
    formulaType: string,
    location: string,
    currency: string,
    version: number,
    minRoyalty: number,
    maxRoyalty: number,
    contribs: Contributor[]
  ): Result<number> {
    if (this.state.nextFormulaId >= this.state.maxFormulas)
      return { ok: false, value: ERR_MAX_FORMULAS_EXCEEDED };
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (!title || title.length > 100)
      return { ok: false, value: ERR_INVALID_TITLE };
    if (description.length > 500)
      return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (royaltyRate < 0 || royaltyRate > 100)
      return { ok: false, value: ERR_INVALID_ROYALTY_RATE };
    if (!["synthesis", "compound", "biotech"].includes(formulaType))
      return { ok: false, value: ERR_INVALID_FORMULA_TYPE };
    if (location.length > 100)
      return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency))
      return { ok: false, value: ERR_INVALID_CURRENCY };
    if (version <= 0) return { ok: false, value: ERR_INVALID_VERSION };
    if (minRoyalty < 0) return { ok: false, value: ERR_INVALID_MIN_ROYALTY };
    if (maxRoyalty < 0) return { ok: false, value: ERR_INVALID_MAX_ROYALTY };
    const totalShare = contribs.reduce((sum, c) => sum + c.share, 0);
    if (contribs.length > 10 || totalShare !== 100)
      return { ok: false, value: ERR_INVALID_CONTRIBUTOR_SHARE };
    if (!this.isVerifiedAuthority(this.caller).value)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    const hashKey = hash.toString();
    if (this.state.formulasByHash.has(hashKey))
      return { ok: false, value: ERR_FORMULA_ALREADY_EXISTS };
    if (!this.state.authorityContract)
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({
      amount: this.state.registrationFee,
      from: this.caller,
      to: this.state.authorityContract,
    });

    const id = this.state.nextFormulaId;
    const formula: Formula = {
      hash,
      title,
      description,
      timestamp: this.blockHeight,
      creator: this.caller,
      royaltyRate,
      formulaType,
      status: true,
      location,
      currency,
      version,
      minRoyalty,
      maxRoyalty,
    };
    this.state.formulas.set(id, formula);
    this.state.formulasByHash.set(hashKey, id);
    this.state.contributors.set(id, contribs);
    this.state.nextFormulaId++;
    return { ok: true, value: id };
  }

  getFormula(id: number): Formula | null {
    return this.state.formulas.get(id) || null;
  }

  updateFormula(
    id: number,
    updateTitle: string,
    updateDescription: string,
    updateRoyaltyRate: number
  ): Result<boolean> {
    const formula = this.state.formulas.get(id);
    if (!formula) return { ok: false, value: false };
    if (formula.creator !== this.caller) return { ok: false, value: false };
    if (!updateTitle || updateTitle.length > 100)
      return { ok: false, value: false };
    if (updateDescription.length > 500) return { ok: false, value: false };
    if (updateRoyaltyRate < 0 || updateRoyaltyRate > 100)
      return { ok: false, value: false };

    const updated: Formula = {
      ...formula,
      title: updateTitle,
      description: updateDescription,
      royaltyRate: updateRoyaltyRate,
      timestamp: this.blockHeight,
    };
    this.state.formulas.set(id, updated);
    this.state.formulaUpdates.set(id, {
      updateTitle,
      updateDescription,
      updateRoyaltyRate,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getFormulaCount(): Result<number> {
    return { ok: true, value: this.state.nextFormulaId };
  }

  checkFormulaExistence(hash: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.formulasByHash.has(hash.toString()) };
  }
}

describe("FormulaRegistry", () => {
  let contract: FormulaRegistryMock;

  beforeEach(() => {
    contract = new FormulaRegistryMock();
    contract.reset();
  });

  it("registers a formula successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "Formula1",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const formula = contract.getFormula(0);
    expect(formula?.title).toBe("Formula1");
    expect(formula?.description).toBe("Test desc");
    expect(formula?.royaltyRate).toBe(5);
    expect(formula?.formulaType).toBe("synthesis");
    expect(formula?.location).toBe("LabX");
    expect(formula?.currency).toBe("STX");
    expect(formula?.version).toBe(1);
    expect(formula?.minRoyalty).toBe(0);
    expect(formula?.maxRoyalty).toBe(100);
    expect(contract.stxTransfers).toEqual([
      { amount: 500, from: "ST1TEST", to: "ST2TEST" },
    ]);
  });

  it("rejects duplicate formula hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash,
      "Formula1",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    const result = contract.registerFormula(
      hash,
      "Formula2",
      "Another desc",
      10,
      "compound",
      "LabY",
      "USD",
      2,
      10,
      200,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_FORMULA_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST2FAKE", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "Formula1",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects registration without authority contract", () => {
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "NoAuth",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid hash length", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(31).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "InvalidHash",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid title", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects invalid formula type", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "InvalidType",
      "Test desc",
      5,
      "invalid",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_FORMULA_TYPE);
  });

  it("updates a formula successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash,
      "OldFormula",
      "Old desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    const result = contract.updateFormula(0, "NewFormula", "New desc", 10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const formula = contract.getFormula(0);
    expect(formula?.title).toBe("NewFormula");
    expect(formula?.description).toBe("New desc");
    expect(formula?.royaltyRate).toBe(10);
    const update = contract.state.formulaUpdates.get(0);
    expect(update?.updateTitle).toBe("NewFormula");
    expect(update?.updateDescription).toBe("New desc");
    expect(update?.updateRoyaltyRate).toBe(10);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent formula", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateFormula(99, "NewFormula", "New desc", 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash,
      "TestFormula",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateFormula(0, "NewFormula", "New desc", 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(1000);
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash,
      "TestFormula",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(contract.stxTransfers).toEqual([
      { amount: 1000, from: "ST1TEST", to: "ST2TEST" },
    ]);
  });

  it("rejects registration fee change without authority contract", () => {
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct formula count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash1,
      "Formula1",
      "Desc1",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    contract.registerFormula(
      hash2,
      "Formula2",
      "Desc2",
      10,
      "compound",
      "LabY",
      "USD",
      2,
      10,
      200,
      contribs
    );
    const result = contract.getFormulaCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks formula existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash,
      "TestFormula",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    const result = contract.checkFormulaExistence(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const hash2 = new Uint8Array(32).fill(2);
    const result2 = contract.checkFormulaExistence(hash2);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });


  it("rejects formula registration with empty title", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    const result = contract.registerFormula(
      hash,
      "",
      "Test desc",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects formula registration with max formulas exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxFormulas = 1;
    const hash1 = new Uint8Array(32).fill(1);
    const contribs: Contributor[] = [{ contributor: "ST1TEST", share: 100 }];
    contract.registerFormula(
      hash1,
      "Formula1",
      "Desc1",
      5,
      "synthesis",
      "LabX",
      "STX",
      1,
      0,
      100,
      contribs
    );
    const hash2 = new Uint8Array(32).fill(2);
    const result = contract.registerFormula(
      hash2,
      "Formula2",
      "Desc2",
      10,
      "compound",
      "LabY",
      "USD",
      2,
      10,
      200,
      contribs
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_FORMULAS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract(
      "SP000000000000000000002Q6VF78"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});
