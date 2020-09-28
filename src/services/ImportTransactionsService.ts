import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  CSVFilename: string;
}

class ImportTransactionsService {
  async execute({ CSVFilename }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(CSVFilename);
    const parsers = csvParse({
      delimiter: ',',
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // Verificação de campos obrigatorios
      if (!title || !type || !value) return;

      // Preenche a lista de categorias e transações.
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // Nova promisse para esperar o processo terminar.
    await new Promise(resolve => parseCSV.on('end', resolve));
    // Lista de categorias encontradas
    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });
    // Lista de titulos de categorias encontradas
    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    // Lista de categorias a serem adicionadas
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    // Cria e inclui as novas categorias
    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(({ title, type, value, category }) => ({
        title,
        type,
        value,
        category: finalCategories.find(
          ({ title: titleCategory }) => titleCategory === category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(CSVFilename);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
